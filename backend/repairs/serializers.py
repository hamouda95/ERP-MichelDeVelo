from rest_framework import serializers
from .models import Repair, RepairItem


class RepairItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairItem
        fields = '__all__'


class RepairSerializer(serializers.ModelSerializer):
    items = RepairItemSerializer(many=True, read_only=True)
    client_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    client = serializers.SerializerMethodField()
    
    class Meta:
        model = Repair
        fields = '__all__'
        read_only_fields = ['reference_number', 'created_by', 'created_at', 'updated_at']
    
    def get_client_name(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}"
    
    def get_client(self, obj):
        return {
            'id': obj.client.id,
            'first_name': obj.client.first_name,
            'last_name': obj.client.last_name,
            'name': f"{obj.client.first_name} {obj.client.last_name}",
            'email': obj.client.email,
            'phone': obj.client.phone if hasattr(obj.client, 'phone') else ''
        }


class RepairCreateSerializer(serializers.ModelSerializer):
    items = RepairItemSerializer(many=True, required=False)
    parts_needed = serializers.ListField(required=False, allow_empty=True)
    
    class Meta:
        model = Repair
        exclude = ['reference_number', 'created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        parts_needed = validated_data.pop('parts_needed', [])
        
        repair = Repair.objects.create(**validated_data)
        
        for item_data in items_data:
            RepairItem.objects.create(repair=repair, **item_data)
        
        return repair
