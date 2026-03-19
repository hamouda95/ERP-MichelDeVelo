from django.db import models
from django.contrib.auth import get_user_model
from clients.models import Client

User = get_user_model()


class DashboardStats(models.Model):
    """
    Statistiques agrégées pour le dashboard
    """
    PERIOD_CHOICES = [
        ('daily', 'Quotidien'),
        ('weekly', 'Hebdomadaire'),
        ('monthly', 'Mensuel'),
        ('yearly', 'Annuel'),
    ]
    
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    date = models.DateField()
    year = models.IntegerField()
    month = models.IntegerField(null=True, blank=True)
    week = models.IntegerField(null=True, blank=True)
    day = models.IntegerField(null=True, blank=True)
    
    # Statistiques ventes
    total_orders = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Statistiques clients
    new_clients = models.IntegerField(default=0)
    total_clients = models.IntegerField(default=0)
    returning_clients = models.IntegerField(default=0)
    
    # Statistiques produits
    total_products = models.IntegerField(default=0)
    low_stock_products = models.IntegerField(default=0)
    out_of_stock_products = models.IntegerField(default=0)
    
    # Statistiques réparations
    total_repairs = models.IntegerField(default=0)
    completed_repairs = models.IntegerField(default=0)
    average_repair_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Statistiques devis
    total_quotes = models.IntegerField(default=0)
    pending_quotes = models.IntegerField(default=0)
    accepted_quotes = models.IntegerField(default=0)
    rejected_quotes = models.IntegerField(default=0)
    
    # Statistiques rendez-vous
    total_appointments = models.IntegerField(default=0)
    completed_appointments = models.IntegerField(default=0)
    cancelled_appointments = models.IntegerField(default=0)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dashboard_stats'
        unique_together = ['period', 'date']
        indexes = [
            models.Index(fields=['period', 'date']),
            models.Index(fields=['year', 'month']),
            models.Index(fields=['year', 'week']),
        ]
    
    def __str__(self):
        return f"Stats {self.period} - {self.date}"


class ProductSales(models.Model):
    """
    Statistiques de ventes par produit
    """
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='sales_stats')
    
    # Période
    date = models.DateField()
    year = models.IntegerField()
    month = models.IntegerField()
    
    # Statistiques ventes
    quantity_sold = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Stock
    stock_start = models.IntegerField(default=0)
    stock_end = models.IntegerField(default=0)
    stock_received = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_sales'
        unique_together = ['product', 'year', 'month']
        indexes = [
            models.Index(fields=['product', 'date']),
            models.Index(fields=['year', 'month']),
            models.Index(fields=['quantity_sold']),
        ]
    
    def __str__(self):
        return f"Ventes {self.product.name} - {self.year}-{self.month:02d}"


class TopProduct(models.Model):
    """
    Top produits temporaires pour performance
    """
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='top_rankings')
    
    # Période et rang
    period = models.CharField(max_length=20, choices=DashboardStats.PERIOD_CHOICES)
    rank = models.IntegerField()
    date = models.DateField()
    
    # Statistiques
    total_sales = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    market_share = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'top_products'
        unique_together = ['period', 'date', 'rank']
        indexes = [
            models.Index(fields=['period', 'date', 'rank']),
            models.Index(fields=['product']),
        ]
    
    def __str__(self):
        return f"Top #{self.rank} {self.product.name} ({self.period})"
