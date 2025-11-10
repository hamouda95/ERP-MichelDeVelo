from django.contrib import admin
from .models import Repair, RepairItem


@admin.register(Repair)
class RepairAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'store', 'status', 'created_at', 'estimated_cost']
    list_filter = ['status', 'store', 'created_at']
    search_fields = ['client__first_name', 'client__last_name']
    readonly_fields = ['created_at', 'updated_at']
    

@admin.register(RepairItem)
class RepairItemAdmin(admin.ModelAdmin):
    list_display = ['repair', 'description', 'quantity', 'unit_price', 'total_price']
    list_filter = ['repair__status']
    search_fields = ['repair__id', 'description']
