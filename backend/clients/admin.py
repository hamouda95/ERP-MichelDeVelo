from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone', 'total_purchases', 'visit_count']
    search_fields = ['first_name', 'last_name', 'email']
    list_filter = ['is_active']
