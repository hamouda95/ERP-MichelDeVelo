from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter

app_name = 'appointments'

router = DefaultRouter()
router.register(r'appointments', views.AppointmentViewSet, basename='appointments')

urlpatterns = [
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
    path('detailed/', views.dashboard_detailed, name='dashboard-detailed'),
] + router.urls
