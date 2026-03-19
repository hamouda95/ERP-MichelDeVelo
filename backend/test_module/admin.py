"""
Configuration admin pour le module de test
"""

from django.contrib import admin
from .models import TestLog, TestData


@admin.register(TestLog)
class TestLogAdmin(admin.ModelAdmin):
    list_display = ['test_type', 'test_name', 'status', 'execution_time', 'created_at']
    list_filter = ['test_type', 'status', 'created_at']
    search_fields = ['test_name', 'message']
    readonly_fields = ['created_at', 'details', 'execution_time']
    ordering = ['-created_at']
    
    def has_delete_permission(self, request, obj=None):
        return False  # Empêcher la suppression manuelle


@admin.register(TestData)
class TestDataAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
