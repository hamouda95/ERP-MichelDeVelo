from django.contrib import admin
from .models import Product, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['reference', 'name', 'price_ttc', 'total_stock', 'is_visible', 'is_active']
    list_filter = ['product_type', 'category', 'is_active', 'is_visible']
    search_fields = ['name', 'reference', 'barcode']
    list_editable = ['is_visible', 'is_active']
