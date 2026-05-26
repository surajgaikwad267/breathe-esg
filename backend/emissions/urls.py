from django.urls import path
from . import views

urlpatterns = [
    path('emissions/', views.EmissionRecordListView.as_view(), name='emission-list'),
]