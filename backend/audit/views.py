from rest_framework.views import APIView
from rest_framework.response import Response
from .models import AuditTrail


class AuditTrailListView(APIView):
    permission_classes = []

    def get(self, request):
        trails = AuditTrail.objects.all().order_by('-performed_at')

        data = [{
            'id': t.id,
            'emission_record_id': t.emission_record.id,
            'action': t.action,
            'performed_at': t.performed_at,
            'old_values': t.old_values,
            'new_values': t.new_values,
            'note': t.note,
        } for t in trails]

        return Response(data)