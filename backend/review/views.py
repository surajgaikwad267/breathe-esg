from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.timezone import now
from emissions.models import EmissionRecord
from audit.models import AuditTrail


class ReviewRecordView(APIView):
    permission_classes = []

    def patch(self, request, pk):
        try:
            record = EmissionRecord.objects.get(pk=pk)
        except EmissionRecord.DoesNotExist:
            return Response({'error': 'Record not found'}, status=404)

        if record.is_locked:
            return Response({'error': 'Record is locked for audit'}, status=400)

        action = request.data.get('action')
        note = request.data.get('note', '')

        if action not in ['approved', 'flagged', 'rejected']:
            return Response({'error': 'Invalid action'}, status=400)

        old_status = record.status
        record.status = action
        record.reviewed_at = now()

        if action == 'approved':
            record.is_locked = True

        record.save()

        # Save audit trail
        AuditTrail.objects.create(
            emission_record=record,
            action=action,
            performed_by=request.user if request.user.is_authenticated else None,
            old_values={'status': old_status},
            new_values={'status': action},
            note=note
        )

        return Response({
            'id': record.id,
            'status': record.status,
            'is_locked': record.is_locked
        })


class ReviewStatsView(APIView):
    permission_classes = []

    def get(self, request):
        total = EmissionRecord.objects.count()
        pending = EmissionRecord.objects.filter(status='pending').count()
        approved = EmissionRecord.objects.filter(status='approved').count()
        flagged = EmissionRecord.objects.filter(status='flagged').count()
        rejected = EmissionRecord.objects.filter(status='rejected').count()

        total_co2e = sum(
            float(r.co2e_kg)
            for r in EmissionRecord.objects.all()
        )

        scope1 = sum(float(r.co2e_kg) for r in EmissionRecord.objects.filter(scope='1'))
        scope2 = sum(float(r.co2e_kg) for r in EmissionRecord.objects.filter(scope='2'))
        scope3 = sum(float(r.co2e_kg) for r in EmissionRecord.objects.filter(scope='3'))

        return Response({
            'total': total,
            'pending': pending,
            'approved': approved,
            'flagged': flagged,
            'rejected': rejected,
            'total_co2e_kg': round(total_co2e, 2),
            'scope1_co2e_kg': round(scope1, 2),
            'scope2_co2e_kg': round(scope2, 2),
            'scope3_co2e_kg': round(scope3, 2),
        })