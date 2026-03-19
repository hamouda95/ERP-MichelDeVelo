from django.contrib import admin
from .models import Store, Service, Role, SystemSetting

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ['name', 'address', 'phone', 'email', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'address']

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'duration', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']

@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'value', 'is_public', 'updated_by', 'updated_at']
    list_filter = ['is_public', 'updated_at']
    search_fields = ['key', 'description']
    readonly_fields = ['updated_at']
