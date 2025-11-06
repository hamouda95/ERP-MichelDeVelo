from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'client', 'store', 'total_ttc', 'status', 'created_at']
    list_filter = ['status', 'store', 'created_at']
    search_fields = ['order_number', 'client__first_name', 'client__last_name']
    inlines = [OrderItemInline]
