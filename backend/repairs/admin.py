from django.contrib import admin
from .models import Repair, RepairItem


@admin.register(Repair)
class RepairAdmin(admin.ModelAdmin):
    list_display = [
        'reference_number', 
        'client', 
        'bike_brand',
        'store', 
        'status', 
        'priority',
        'created_at', 
        'estimated_cost',
        'max_budget'
    ]
    list_filter = [
        'status', 
        'priority',
        'store', 
        'created_at',
        'estimated_completion'
    ]
    search_fields = [
        'reference_number',
        'client__first_name', 
        'client__last_name',
        'bike_brand',
        'bike_model',
        'description'
    ]
    readonly_fields = [
        'reference_number',
        'created_at', 
        'updated_at',
        'created_by'
    ]
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('reference_number', 'client', 'store', 'status', 'priority')
        }),
        ('Vélo', {
            'fields': ('bike_brand', 'bike_model', 'bike_serial_number')
        }),
        ('Description', {
            'fields': ('description', 'diagnosis', 'notes')
        }),
        ('Dates', {
            'fields': ('created_at', 'estimated_completion', 'actual_completion', 'updated_at')
        }),
        ('Coûts', {
            'fields': ('max_budget', 'estimated_cost', 'final_cost', 'deposit_paid')
        }),
        ('Pièces', {
            'fields': ('parts_needed',),
            'classes': ('collapse',)
        }),
        ('Gestion', {
            'fields': ('assigned_to', 'created_by')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Ajouter l'utilisateur courant comme créateur si nouvelle réparation"""
        if not change:  # Si c'est une création
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    

@admin.register(RepairItem)
class RepairItemAdmin(admin.ModelAdmin):
    list_display = [
        'repair', 
        'description', 
        'quantity', 
        'unit_price', 
        'total_price'
    ]
    list_filter = ['repair__status', 'repair__store']
    search_fields = ['repair__reference_number', 'description']
    readonly_fields = ['total_price']
