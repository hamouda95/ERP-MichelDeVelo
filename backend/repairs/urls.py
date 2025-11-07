from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'repairs', views.RepairViewSet, basename='repair')
router.register(r'repair-items', views.RepairItemViewSet, basename='repair-item')

urlpatterns = [
    path('', include(router.urls)),
]