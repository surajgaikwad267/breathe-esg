from django.urls import path
from . import views

urlpatterns = [
    path('ingest/sap/', views.IngestSAPView.as_view(), name='ingest-sap'),
    path('ingest/utility/', views.IngestUtilityView.as_view(), name='ingest-utility'),
    path('ingest/travel/', views.IngestTravelView.as_view(), name='ingest-travel'),
    path('batches/', views.BatchListView.as_view(), name='batch-list'),
]