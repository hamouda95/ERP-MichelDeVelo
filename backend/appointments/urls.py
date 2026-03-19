from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'appointments'

router = DefaultRouter()
router.register(r'appointments', views.AppointmentViewSet, basename='appointments')

urlpatterns = [
    path('', views.AppointmentViewSet.as_view({'get': 'list'}), name='appointment-list'),
    path('stats/', views.AppointmentViewSet.as_view({'get': 'statistics'}), name='appointment-stats'),
    path('today/', views.AppointmentViewSet.as_view({'get': 'today'}), name='appointment-today'),
    path('upcoming/', views.AppointmentViewSet.as_view({'get': 'upcoming'}), name='appointment-upcoming'),
    path('sync-wix/', views.AppointmentViewSet.as_view({'post': 'sync_wix'}), name='sync-wix'),
    path('sync-status/', views.AppointmentViewSet.as_view({'get': 'sync_status'}), name='sync-status'),
    path('force-sync/', views.AppointmentViewSet.as_view({'post': 'force_sync'}), name='force-sync'),
    path('wix-stats/', views.AppointmentViewSet.as_view({'get': 'wix_stats'}), name='wix-stats'),
]
