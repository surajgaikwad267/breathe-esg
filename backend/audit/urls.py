from django.urls import path
from . import views

urlpatterns = [
    path('audit/', views.AuditTrailListView.as_view(), name='audit-list'),
]