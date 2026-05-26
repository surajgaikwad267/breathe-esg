from django.db import models
from django.contrib.auth.models import User
from tenants.models import Tenant


class IngestionBatch(models.Model):
    SOURCE_TYPES = [
        ('sap', 'SAP'),
        ('utility', 'Utility'),
        ('travel', 'Travel'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('done', 'Done'),
        ('failed', 'Failed'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    uploaded_file = models.FileField(upload_to='uploads/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    row_count = models.IntegerField(default=0)
    error_log = models.JSONField(default=list)

    def __str__(self):
        return f"{self.source_type} batch {self.id} - {self.tenant.name}"


class RawIngestionLog(models.Model):
    PARSE_STATUS = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('suspicious', 'Suspicious'),
    ]

    batch = models.ForeignKey(IngestionBatch, on_delete=models.CASCADE, related_name='raw_logs')
    row_number = models.IntegerField()
    raw_data = models.JSONField()
    parse_status = models.CharField(max_length=20, choices=PARSE_STATUS, default='success')
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"Row {self.row_number} - Batch {self.batch.id}"