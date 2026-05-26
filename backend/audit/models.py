from django.db import models
from django.contrib.auth.models import User
from emissions.models import EmissionRecord


class AuditTrail(models.Model):
    ACTION_CHOICES = [
        ('approved', 'Approved'),
        ('flagged', 'Flagged'),
        ('rejected', 'Rejected'),
        ('edited', 'Edited'),
    ]

    emission_record = models.ForeignKey(
        EmissionRecord,
        on_delete=models.CASCADE,
        related_name='audit_trails'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    performed_at = models.DateTimeField(auto_now_add=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    note = models.TextField(blank=True)

    def __str__(self):
        return f"{self.action} by {self.performed_by} on record {self.emission_record.id}"