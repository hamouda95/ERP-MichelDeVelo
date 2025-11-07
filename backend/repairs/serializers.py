from rest_framework import serializers
from .models import Repair, RepairItem
from clients.serializers import ClientSerializer


class RepairItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairItem
        fields = '__all__'


class RepairSerializer(serializers.ModelSerializer):
    items = RepairItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Repair
        fields = '__all__'
        read_only_fields = ['repair_number', 'created_by', 'created_at', 'updated_at']


class RepairCreateSerializer(serializers.ModelSerializer):
    items = RepairItemSerializer(many=True, required=False)
    
    class Meta:
        model = Repair
        exclude = ['repair_number', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        repair = Repair.objects.create(**validated_data)
        
        for item_data in items_data:
            RepairItem.objects.create(repair=repair, **item_data)
        
        return repair