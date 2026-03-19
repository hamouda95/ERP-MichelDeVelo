"""
URLs améliorées pour l'atelier de magasin digital
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_enhanced import (
    RepairViewSet, 
    RepairItemViewSet, 
    WorkshopWorkloadViewSet
)

router = DefaultRouter()
router.register(r'repairs', RepairViewSet, basename='repair')
router.register(r'repair-items', RepairItemViewSet, basename='repairitem')
router.register(r'workload', WorkshopWorkloadViewSet, basename='workload')

urlpatterns = [
    path('', include(router.urls)),
]
