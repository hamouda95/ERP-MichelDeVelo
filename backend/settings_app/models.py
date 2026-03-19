from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Store(models.Model):
    """Configuration des magasins"""
    name = models.CharField(max_length=100)
    address = models.TextField()
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    siret = models.CharField(max_length=14, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Magasin'
        verbose_name_plural = 'Magasins'

    def __str__(self):
        return self.name

class Service(models.Model):
    """Services proposés"""
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration = models.DurationField(help_text="Durée estimée du service")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Service'
        verbose_name_plural = 'Services'

    def __str__(self):
        return f"{self.name} - {self.price}€"

class Role(models.Model):
    """Rôles utilisateurs personnalisés"""
    name = models.CharField(max_length=50)
    description = models.TextField()
    permissions = models.JSONField(default=dict, help_text="Permissions au format JSON")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Rôle'
        verbose_name_plural = 'Rôles'

    def __str__(self):
        return self.name

class SystemSetting(models.Model):
    """Configuration système"""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False, help_text="Visible par tous les utilisateurs")
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Paramètre système'
        verbose_name_plural = 'Paramètres système'

    def __str__(self):
        return f"{self.key}: {self.value}"
