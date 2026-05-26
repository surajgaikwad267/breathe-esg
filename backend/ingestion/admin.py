from django.contrib import admin
from .models import IngestionBatch, RawIngestionLog

admin.site.register(IngestionBatch)
admin.site.register(RawIngestionLog)