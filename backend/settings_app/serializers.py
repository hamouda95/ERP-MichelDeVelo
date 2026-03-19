from rest_framework import serializers
from .models import Store, Service, Role, SystemSetting

class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ['id', 'name', 'address', 'phone', 'email', 'siret', 'is_active', 'created_at', 'updated_at']

class ServiceSerializer(serializers.ModelSerializer):
    duration_hours = serializers.DurationField(source='duration', read_only=True)
    
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'price', 'duration', 'duration_hours', 'is_active', 'created_at', 'updated_at']

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'is_active', 'created_at', 'updated_at']

class SystemSettingSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description', 'is_public', 'updated_by', 'updated_by_name', 'updated_at']
        read_only_fields = ['updated_by', 'updated_at']
