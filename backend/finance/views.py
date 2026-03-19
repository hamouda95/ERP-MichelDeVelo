from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
import csv
from django.http import HttpResponse

from .models import Expense, Revenue
from .serializers import ExpenseSerializer, RevenueSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des dépenses"""
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Expense.objects.all()
        
        # Filtres
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
            
        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        return queryset.select_related('created_by')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class RevenueViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des revenus"""
    serializer_class = RevenueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Revenue.objects.all()
        
        # Filtres
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
            
        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        return queryset.select_related('created_by')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

# Vues pour le dashboard finance
def dashboard_stats(request):
    """Statistiques du dashboard finance"""
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import date
    from finance.models import Expense, Revenue
    from rest_framework.response import Response
    
    # Vérification manuelle de l'authentification
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return Response({'error': 'Non autorisé'}, status=401)
    
    today = timezone.now().date()
    current_month = date(today.year, today.month, 1)
    
    # Calculer le mois précédent correctement
    if today.month == 1:
        last_month = date(today.year - 1, 12, 1)
    else:
        last_month = date(today.year, today.month - 1, 1)
    
    # Dépenses du mois en cours
    current_month_expenses = Expense.objects.filter(
        date__gte=current_month,
        date__lte=today
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Dépenses du mois précédent
    last_month_expenses = Expense.objects.filter(
        date__gte=last_month,
        date__lt=current_month
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Revenus du mois en cours
    current_month_revenue = Revenue.objects.filter(
        date__gte=current_month,
        date__lte=today
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Revenus du mois précédent
    last_month_revenue = Revenue.objects.filter(
        date__gte=last_month,
        date__lt=current_month
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Bénéfice/perte
    current_profit = current_month_revenue - current_month_expenses
    last_profit = last_month_revenue - last_month_expenses
    
    # Dépenses par catégorie
    expenses_by_category = Expense.objects.filter(
        date__gte=current_month,
        date__lte=today
    ).values('category').annotate(total=Sum('amount')).order_by('-total')
    
    # Revenus par catégorie
    revenue_by_category = Revenue.objects.filter(
        date__gte=current_month,
        date__lte=today
    ).values('category').annotate(total=Sum('amount')).order_by('-total')
    
    return Response({
        'current_month': {
            'expenses': float(current_month_expenses),
            'revenue': float(current_month_revenue),
            'profit': float(current_profit),
        },
        'last_month': {
            'expenses': float(last_month_expenses),
            'revenue': float(last_month_revenue),
            'profit': float(last_profit),
        },
        'expenses_by_category': list(expenses_by_category),
        'revenue_by_category': list(revenue_by_category),
        'trends': {
            'expenses_change': ((current_month_expenses - last_month_expenses) / last_month_expenses * 100) if last_month_expenses > 0 else 0,
            'revenue_change': ((current_month_revenue - last_month_revenue) / last_month_revenue * 100) if last_month_revenue > 0 else 0,
            'profit_change': ((current_profit - last_profit) / abs(last_profit) * 100) if last_profit != 0 else 0,
        }
    })

def profit_loss(request):
    """Rapport profit & loss"""
    if not request.user.is_authenticated:
        return Response({'error': 'Non autorisé'}, status=401)
    
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    expenses = Expense.objects.all()
    revenues = Revenue.objects.all()
    
    if start_date:
        expenses = expenses.filter(date__gte=start_date)
        revenues = revenues.filter(date__gte=start_date)
    
    if end_date:
        expenses = expenses.filter(date__lte=end_date)
        revenues = revenues.filter(date__lte=end_date)
    
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
    total_revenues = revenues.aggregate(total=Sum('amount'))['total'] or 0
    
    # Dépenses par catégorie
    expenses_detail = expenses.values('category', 'description', 'amount', 'date').order_by('-date')
    
    # Revenus par catégorie
    revenues_detail = revenues.values('category', 'description', 'amount', 'date', 'source').order_by('-date')
    
    return Response({
        'summary': {
            'total_expenses': float(total_expenses),
            'total_revenues': float(total_revenues),
            'net_profit': float(total_revenues - total_expenses),
        },
        'expenses': list(expenses_detail),
        'revenues': list(revenues_detail),
        'expenses_by_category': list(expenses.values('category').annotate(total=Sum('amount')).order_by('-total')),
        'revenues_by_category': list(revenues.values('category').annotate(total=Sum('amount')).order_by('-total')),
    })
