from rest_framework.views import APIView
from rest_framework.response import Response
from .models import EmissionRecord


class EmissionRecordListView(APIView):
    permission_classes = []

    def get(self, request):
        records = EmissionRecord.objects.all().order_by('-created_at')

        # Filters
        source_type = request.GET.get('source_type')
        scope = request.GET.get('scope')
        status = request.GET.get('status')

        if source_type:
            records = records.filter(source_type=source_type)
        if scope:
            records = records.filter(scope=scope)
        if status:
            records = records.filter(status=status)

        data = [{
            'id': r.id,
            'scope': r.scope,
            'category': r.category,
            'source_type': r.source_type,
            'activity_value': str(r.activity_value),
            'activity_unit': r.activity_unit,
            'co2e_kg': str(r.co2e_kg),
            'period_start': r.period_start,
            'period_end': r.period_end,
            'facility': r.facility,
            'vendor': r.vendor,
            'status': r.status,
            'is_locked': r.is_locked,
            'created_at': r.created_at,
        } for r in records]

        return Response(data)