from django.contrib import admin
from .models import Expense, Revenue

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['category', 'description', 'amount', 'date', 'payment_method', 'created_by']
    list_filter = ['category', 'payment_method', 'date', 'created_by']
    search_fields = ['description']
    date_hierarchy = 'date'
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Revenue)
class RevenueAdmin(admin.ModelAdmin):
    list_display = ['category', 'description', 'amount', 'date', 'source', 'created_by']
    list_filter = ['category', 'date', 'created_by']
    search_fields = ['description', 'source']
    date_hierarchy = 'date'
    readonly_fields = ['created_at', 'updated_at']
