"""
Modèles de test pour le module de développement
"""

from django.db import models


class TestLog(models.Model):
    """
    Journal des tests effectués
    """
    test_type = models.CharField(max_length=50)
    test_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=[
        ('success', 'Succès'),
        ('error', 'Erreur'),
        ('warning', 'Avertissement')
    ])
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    execution_time = models.FloatField(help_text="Temps d'exécution en secondes")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Log de test"
        verbose_name_plural = "Logs de tests"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.test_type} - {self.test_name} ({self.status})"


class TestData(models.Model):
    """
    Données de test temporaires
    """
    name = models.CharField(max_length=100)
    data = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Donnée de test"
        verbose_name_plural = "Données de test"
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
