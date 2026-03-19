from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_stats, name='dashboard'),
    path('dashboard/detailed/', views.dashboard_detailed, name='dashboard-detailed'),
    # Nouveaux endpoints analytics
    path('sales/', views.sales_stats, name='sales-stats'),
    path('sales/trends/', views.sales_trends, name='sales-trends'),
    path('products/top/', views.top_products, name='top-products'),
    path('clients/top/', views.top_clients, name='top-clients'),
    path('products/', views.product_stats, name='product-stats'),
    path('inventory/', views.inventory_report, name='inventory-report'),
    path('clients/', views.client_stats, name='client-stats'),
    path('repairs/', views.repair_stats, name='repair-stats'),
    path('repairs/mechanics/', views.mechanic_performance, name='mechanic-performance'),
]


