from django.urls import path
from . import views

urlpatterns = [
    path('review/<int:pk>/', views.ReviewRecordView.as_view(), name='review-record'),
    path('review/stats/', views.ReviewStatsView.as_view(), name='review-stats'),
]