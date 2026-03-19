"""
URLs pour le module de test ERP
"""

from django.urls import path
from . import views

app_name = 'test_module'

urlpatterns = [
    path('', views.test_dashboard, name='test_dashboard'),
    path('api-test/', views.api_test, name='api_test'),
    path('db-test/', views.database_test, name='database_test'),
    path('wix-test/', views.wix_test, name='wix_test'),
    path('auth-test/', views.auth_test, name='auth_test'),
    path('frontend-test/', views.frontend_test, name='frontend_test'),
    path('cleanup/', views.cleanup_test_data, name='cleanup_test'),
]
