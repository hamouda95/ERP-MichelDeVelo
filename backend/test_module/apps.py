"""
Configuration de l'application de test
"""

from django.apps import AppConfig


class TestModuleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'test_module'
    verbose_name = 'Module de Test ERP'
    
    def ready(self):
        # Import des signaux si nécessaire
        pass
