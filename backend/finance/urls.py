from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'revenue', views.RevenueViewSet, basename='revenue')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard_stats, name='finance-dashboard'),
    path('profit-loss/', views.profit_loss, name='profit-loss'),
]
