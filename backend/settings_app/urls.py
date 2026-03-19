from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'stores', views.StoreViewSet, basename='store')
router.register(r'services', views.ServiceViewSet, basename='service')
router.register(r'roles', views.RoleViewSet, basename='role')
router.register(r'system-settings', views.SystemSettingViewSet, basename='systemsetting')

urlpatterns = [
    path('', include(router.urls)),
    path('', views.get_settings, name='get-settings'),
    path('update/', views.update_settings, name='update-settings'),
    path('system/', views.system_info, name='system-info'),
    path('backup/', views.backup_database, name='backup-database'),
    path('restore/', views.restore_database, name='restore-database'),
]
