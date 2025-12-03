from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from orders.models import Order, OrderItem
from products.models import Product
from clients.models import Client


def decimal_to_float(value):
    """Convertir Decimal en float pour JSON"""
    if isinstance(value, Decimal):
        return float(value)
    return value if value is not None else 0


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Vue d'ensemble pour le dashboard"""
    
    try:
        # Chiffre d'affaires total
        total_revenue_result = Order.objects.filter(
            status='completed'
        ).aggregate(total=Sum('total_ttc'))
        total_revenue = decimal_to_float(total_revenue_result['total'])
        
        # Nombre total de commandes
        total_orders = Order.objects.count()
        
        # Nombre total de clients
        total_clients = Client.objects.filter(is_active=True).count()
        
        # Nombre total de produits
        total_products = Product.objects.filter(is_active=True).count()
        
        # Ventes par mois (6 derniers mois) - AVEC TIMEZONE
        sales_by_month = []
        now = timezone.now()
        
        for i in range(5, -1, -1):
            # Calculer le début du mois avec timezone
            month_date = now - timedelta(days=30*i)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if i == 0:
                month_end = now
            else:
                if month_start.month == 12:
                    next_month = month_start.replace(year=month_start.year + 1, month=1)
                else:
                    next_month = month_start.replace(month=month_start.month + 1)
                month_end = next_month - timedelta(seconds=1)
            
            month_sales_result = Order.objects.filter(
                created_at__gte=month_start,
                created_at__lte=month_end,
                status='completed'
            ).aggregate(total=Sum('total_ttc'))
            
            month_sales = decimal_to_float(month_sales_result['total'])
            
            sales_by_month.append({
                'month': month_start.strftime('%b %Y'),
                'total': month_sales
            })
        
        # Top 5 produits les plus vendus
        top_products_query = OrderItem.objects.values(
            'product__name'
        ).annotate(
            quantity=Sum('quantity')
        ).order_by('-quantity')[:5]
        
        top_products_data = []
        for item in top_products_query:
            if item['product__name']:
                top_products_data.append({
                    'name': item['product__name'],
                    'quantity': int(item['quantity'])
                })
        
        # Ventes par magasin
        ville_avray_result = Order.objects.filter(
            store='ville_avray',
            status='completed'
        ).aggregate(total=Sum('total_ttc'))
        ville_avray_sales = decimal_to_float(ville_avray_result['total'])
        
        garches_result = Order.objects.filter(
            store='garches',
            status='completed'
        ).aggregate(total=Sum('total_ttc'))
        garches_sales = decimal_to_float(garches_result['total'])
        
        store_stats = {
            'ville_avray': ville_avray_sales,
            'garches': garches_sales
        }
        
        # Produits en rupture de stock - UTILISER stock_ville_avray + stock_garches
        # Calculer le stock total et filtrer ceux qui ont <= 5
        all_products = Product.objects.filter(is_active=True)
        low_stock_data = []
        
        for p in all_products:
            total_stock = (p.stock_ville_avray or 0) + (p.stock_garches or 0)
            if total_stock <= 5:
                low_stock_data.append({
                    'id': p.id,
                    'name': p.name,
                    'reference': p.reference,
                    'total_stock': total_stock
                })
                if len(low_stock_data) >= 20: #5
                    break
        
        # Dernières commandes (10 dernières)
        recent_orders = Order.objects.select_related('client').order_by('-created_at')[:10]
        
        recent_orders_data = []
        for order in recent_orders:
            recent_orders_data.append({
                'id': order.id,
                'order_number': order.order_number,
                'client_name': f"{order.client.first_name} {order.client.last_name}",
                'store': order.store,
                'total_ttc': decimal_to_float(order.total_ttc),
                'status': order.status
            })
        
        stats = {
            'totalRevenue': total_revenue,
            'totalOrders': total_orders,
            'totalClients': total_clients,
            'totalProducts': total_products,
            'salesByMonth': sales_by_month,
            'topProducts': top_products_data,
            'storeStats': store_stats,
            'lowStockProducts': low_stock_data,
            'recentOrders': recent_orders_data
        }
        
        return Response(stats)
        
    except Exception as e:
        print(f"Erreur dans dashboard_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Retourner des données vides en cas d'erreur
        return Response({
            'totalRevenue': 0,
            'totalOrders': 0,
            'totalClients': 0,
            'totalProducts': 0,
            'salesByMonth': [],
            'topProducts': [],
            'storeStats': {'ville_avray': 0, 'garches': 0},
            'lowStockProducts': [],
            'recentOrders': []
        })
