from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import now
from .models import IngestionBatch, RawIngestionLog
from tenants.models import Tenant
import pandas as pd
import math


def get_tenant(user):
    # For now return first tenant - in production would be user's tenant
    return Tenant.objects.first()


# ─── Emission factor lookup (kgCO2e per unit) ───────────────────────────────
EMISSION_FACTORS = {
    'diesel':      {'factor': 2.68,  'unit': 'liters'},
    'petrol':      {'factor': 2.31,  'unit': 'liters'},
    'electricity': {'factor': 0.233, 'unit': 'kwh'},
    'flight':      {'factor': 0.255, 'unit': 'km'},
    'hotel':       {'factor': 20.6,  'unit': 'nights'},
    'car':         {'factor': 0.171, 'unit': 'km'},
}

# Basic airport coordinates for distance calculation
AIRPORTS = {
    'DEL': (28.5562, 77.1000),
    'BOM': (19.0896, 72.8656),
    'BLR': (13.1986, 77.7066),
    'MAA': (12.9941, 80.1709),
    'HYD': (17.2313, 78.4298),
    'CCU': (22.6520, 88.4463),
    'LHR': (51.4700, -0.4543),
    'JFK': (40.6413, -73.7781),
    'DXB': (25.2532, 55.3657),
    'SIN': (1.3644, 103.9915),
}


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def get_flight_distance(origin, dest):
    origin = origin.upper().strip()
    dest = dest.upper().strip()
    if origin in AIRPORTS and dest in AIRPORTS:
        lat1, lon1 = AIRPORTS[origin]
        lat2, lon2 = AIRPORTS[dest]
        return haversine(lat1, lon1, lat2, lon2)
    return 1000  # default fallback distance


# ─── SAP Parser ─────────────────────────────────────────────────────────────
def parse_sap(batch, file):
    from emissions.models import EmissionRecord
    import io

    try:
        content = file.read()
        df = pd.read_csv(io.BytesIO(content), encoding='latin-1')
        df.columns = [c.strip().upper() for c in df.columns]
        success = 0
        failed = 0

        for i, row in df.iterrows():
            raw = RawIngestionLog.objects.create(
                batch=batch,
                row_number=i + 1,
                raw_data=row.to_dict()
            )
            try:
                quantity = float(str(row.get('MENGE', 0)).replace(',', '.'))
                unit = str(row.get('MEINS', 'L')).strip().upper()
                date_str = str(row.get('BLDAT', ''))
                facility = str(row.get('WERKS', ''))
                vendor = str(row.get('LIFNR', ''))
                material = str(row.get('MATNR', '')).lower()

                # Determine category from material
                if any(x in material for x in ['diesel', 'dies']):
                    category = 'diesel'
                elif any(x in material for x in ['petrol', 'petr', 'gas']):
                    category = 'petrol'
                else:
                    category = 'diesel'  # default for fuel

                # Normalize unit to liters
                if unit in ['L', 'LTR', 'LITERS']:
                    liters = quantity
                elif unit in ['KG', 'KGS']:
                    liters = quantity * 1.136
                elif unit == 'GAL':
                    liters = quantity * 3.785
                else:
                    liters = quantity

                co2e = liters * EMISSION_FACTORS[category]['factor']

                # Parse date
                from datetime import datetime
                for fmt in ['%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt).date()
                        break
                    except:
                        parsed_date = datetime.today().date()

                EmissionRecord.objects.create(
                    tenant=batch.tenant,
                    batch=batch,
                    raw_log=raw,
                    scope='1',
                    category=category,
                    source_type='sap',
                    activity_value=round(liters, 4),
                    activity_unit='liters',
                    co2e_kg=round(co2e, 4),
                    period_start=parsed_date,
                    period_end=parsed_date,
                    facility=facility,
                    vendor=vendor,
                )
                raw.parse_status = 'success'
                raw.save()
                success += 1

            except Exception as e:
                raw.parse_status = 'failed'
                raw.error_message = str(e)
                raw.save()
                failed += 1

        batch.status = 'done'
        batch.row_count = success
        batch.save()
        return success, failed

    except Exception as e:
        batch.status = 'failed'
        batch.error_log = [str(e)]
        batch.save()
        return 0, 0


# ─── Utility Parser ──────────────────────────────────────────────────────────
def parse_utility(batch, file):
    from emissions.models import EmissionRecord
    import io
    from datetime import datetime

    try:
        content = file.read()
        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
        success = 0
        failed = 0

        for i, row in df.iterrows():
            raw = RawIngestionLog.objects.create(
                batch=batch,
                row_number=i + 1,
                raw_data=row.to_dict()
            )
            try:
                kwh = float(str(row.get('consumption_kwh', 0)).replace(',', ''))
                facility = str(row.get('facility_name', ''))
                meter_id = str(row.get('meter_id', ''))

                period_start_str = str(row.get('billing_period_start', ''))
                period_end_str = str(row.get('billing_period_end', ''))

                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        period_start = datetime.strptime(period_start_str, fmt).date()
                        period_end = datetime.strptime(period_end_str, fmt).date()
                        break
                    except:
                        period_start = datetime.today().date()
                        period_end = datetime.today().date()

                co2e = kwh * EMISSION_FACTORS['electricity']['factor']

                EmissionRecord.objects.create(
                    tenant=batch.tenant,
                    batch=batch,
                    raw_log=raw,
                    scope='2',
                    category='electricity',
                    source_type='utility',
                    activity_value=round(kwh, 4),
                    activity_unit='kWh',
                    co2e_kg=round(co2e, 4),
                    period_start=period_start,
                    period_end=period_end,
                    facility=facility,
                    vendor=meter_id,
                )
                raw.parse_status = 'success'
                raw.save()
                success += 1

            except Exception as e:
                raw.parse_status = 'failed'
                raw.error_message = str(e)
                raw.save()
                failed += 1

        batch.status = 'done'
        batch.row_count = success
        batch.save()
        return success, failed

    except Exception as e:
        batch.status = 'failed'
        batch.error_log = [str(e)]
        batch.save()
        return 0, 0


# ─── Travel Parser ───────────────────────────────────────────────────────────
def parse_travel(batch, file):
    from emissions.models import EmissionRecord
    import io
    from datetime import datetime

    try:
        content = file.read()
        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
        success = 0
        failed = 0

        for i, row in df.iterrows():
            raw = RawIngestionLog.objects.create(
                batch=batch,
                row_number=i + 1,
                raw_data={k: str(v) for k, v in row.to_dict().items()}
            )
            try:
                mode = str(row.get('transport_mode', 'flight')).lower().strip()
                employee = str(row.get('employee_id', ''))
                date_str = str(row.get('travel_date', ''))

                travel_date = datetime.today().date()
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        travel_date = datetime.strptime(date_str, fmt).date()
                        break
                    except:
                        continue

                if mode == 'flight':
                    origin = str(row.get('origin', ''))
                    dest = str(row.get('destination', ''))
                    distance = get_flight_distance(origin, dest)
                    co2e = distance * EMISSION_FACTORS['flight']['factor']
                    category = 'flight'
                    scope = '3'
                    activity_unit = 'km'
                    activity_value = distance

                elif mode == 'hotel':
                    nights = float(str(row.get('hotel_nights', 1)))
                    co2e = nights * EMISSION_FACTORS['hotel']['factor']
                    category = 'hotel'
                    scope = '3'
                    activity_unit = 'nights'
                    activity_value = nights

                else:
                    distance = float(str(row.get('distance_km', 50)))
                    co2e = distance * EMISSION_FACTORS['car']['factor']
                    category = 'car'
                    scope = '3'
                    activity_unit = 'km'
                    activity_value = distance

                EmissionRecord.objects.create(
                    tenant=batch.tenant,
                    batch=batch,
                    raw_log=raw,
                    scope=scope,
                    category=category,
                    source_type='travel',
                    activity_value=round(activity_value, 4),
                    activity_unit=activity_unit,
                    co2e_kg=round(co2e, 4),
                    period_start=travel_date,
                    period_end=travel_date,
                    facility='',
                    vendor=employee,
                )
                raw.parse_status = 'success'
                raw.save()
                success += 1

            except Exception as e:
                print("TRAVEL ROW ERROR:", str(e))
                raw.parse_status = 'failed'
                raw.error_message = str(e)
                raw.save()
                failed += 1

        batch.status = 'done'
        batch.row_count = success
        batch.save()
        return success, failed

    except Exception as e:
        print("TRAVEL PARSE FATAL ERROR:", str(e))
        batch.status = 'failed'
        batch.error_log = [str(e)]
        batch.save()
        return 0, 0


# ─── API Views ───────────────────────────────────────────────────────────────
class IngestSAPView(APIView):
    permission_classes = []

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        tenant = get_tenant(request.user)
        file.seek(0)
        batch = IngestionBatch.objects.create(
            tenant=tenant,
            source_type='sap',
            uploaded_file=file,
            uploaded_by=request.user if request.user.is_authenticated else None,
            status='processing'
        )
        file.seek(0)
        success, failed = parse_sap(batch, file)
        return Response({
            'batch_id': batch.id,
            'status': batch.status,
            'success_rows': success,
            'failed_rows': failed
        })


class IngestUtilityView(APIView):
    permission_classes = []

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        tenant = get_tenant(request.user)
        batch = IngestionBatch.objects.create(
            tenant=tenant,
            source_type='utility',
            uploaded_file=file,
            uploaded_by=request.user if request.user.is_authenticated else None,
            status='processing'
        )
        file.seek(0)
        success, failed = parse_utility(batch, file)
        return Response({
            'batch_id': batch.id,
            'status': batch.status,
            'success_rows': success,
            'failed_rows': failed
        })


class IngestTravelView(APIView):
    permission_classes = []

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        tenant = get_tenant(request.user)
        batch = IngestionBatch.objects.create(
            tenant=tenant,
            source_type='travel',
            uploaded_file=file,
            uploaded_by=request.user if request.user.is_authenticated else None,
            status='processing'
        )
        file.seek(0)
        success, failed = parse_travel(batch, file)
        return Response({
            'batch_id': batch.id,
            'status': batch.status,
            'success_rows': success,
            'failed_rows': failed
        })


class BatchListView(APIView):
    permission_classes = []

    def get(self, request):
        batches = IngestionBatch.objects.all().order_by('-uploaded_at')
        data = [{
            'id': b.id,
            'source_type': b.source_type,
            'status': b.status,
            'row_count': b.row_count,
            'uploaded_at': b.uploaded_at,
            'error_log': b.error_log,
        } for b in batches]
        return Response(data)