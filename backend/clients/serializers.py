from rest_framework import serializers
from .models import Client
import re

class ClientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'full_name',
            'total_purchases', 'visit_count'
        ]
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'email': {'required': False, 'allow_blank': True, 'allow_null': True},
            'address': {'required': False, 'allow_blank': True},
            'city': {'required': False, 'allow_blank': True},
            'postal_code': {'required': False, 'allow_blank': True},
            'country': {'required': False, 'allow_blank': True},
            'phone': {'required': True},  # seul obligatoire
        }

    def validate_email(self, value):
        """Validate email format if provided"""
        if value:
            value = value.lower().strip()
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value):
                raise serializers.ValidationError("Format d'email invalide")
        return value

    def validate_phone(self, value):
        """Validate phone format (obligatoire)"""
        value = value.strip()
        phone_regex = r'^[0-9\s+()-]+$'
        if not re.match(phone_regex, value):
            raise serializers.ValidationError("Format de téléphone invalide")
        digits_only = re.sub(r'[^0-9]', '', value)
        if len(digits_only) < 10:
            raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 10 chiffres")
        return value

    def validate_postal_code(self, value):
        """Validate postal code format if provided"""
        if value:
            value = value.strip()
            if not re.match(r'^\d{5}$', value):
                raise serializers.ValidationError("Le code postal doit contenir 5 chiffres")
        return value

    def validate(self, data):
        """Additional validation: ensure email uniqueness if provided"""
        email = data.get('email')
        if email:
            email = email.lower().strip()
            qs = Client.objects.filter(email=email)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({'email': 'Un client avec cet email existe déjà'})
        return data
