from django.db import models
from django.contrib.auth.models import User
from tenants.models import Tenant
from ingestion.models import IngestionBatch, RawIngestionLog


class EmissionRecord(models.Model):
    SCOPE_CHOICES = [
        ('1', 'Scope 1'),
        ('2', 'Scope 2'),
        ('3', 'Scope 3'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('flagged', 'Flagged'),
        ('rejected', 'Rejected'),
    ]

    # Multi-tenancy
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)

    # Source tracking - which batch and raw row produced this
    batch = models.ForeignKey(IngestionBatch, on_delete=models.CASCADE)
    raw_log = models.ForeignKey(RawIngestionLog, on_delete=models.CASCADE)

    # Scope and category
    scope = models.CharField(max_length=1, choices=SCOPE_CHOICES)
    category = models.CharField(max_length=100)  # e.g. diesel, electricity, flight
    source_type = models.CharField(max_length=20)  # sap, utility, travel

    # Activity data
    activity_value = models.DecimalField(max_digits=15, decimal_places=4)
    activity_unit = models.CharField(max_length=50)   # original unit e.g. liters, kWh, km
    co2e_kg = models.DecimalField(max_digits=15, decimal_places=4)  # normalized

    # Time period
    period_start = models.DateField()
    period_end = models.DateField()

    # Optional metadata
    facility = models.CharField(max_length=255, blank=True)
    vendor = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    # Review status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_records'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    is_locked = models.BooleanField(default=False)  # True after approved for audit

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.source_type} | {self.category} | {self.co2e_kg} kgCO2e"