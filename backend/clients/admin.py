from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone', 'city', 'total_purchases', 'visit_count', 'is_active', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    list_filter = ['is_active', 'country', 'created_at']
    readonly_fields = ['created_at', 'updated_at', 'full_name']
    
    fieldsets = (
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'date_of_birth')
        }),
        ('Adresse', {
            'fields': ('address', 'city', 'postal_code', 'country')
        }),
        ('Informations commerciales', {
            'fields': ('total_purchases', 'visit_count', 'is_active', 'notes')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related()
