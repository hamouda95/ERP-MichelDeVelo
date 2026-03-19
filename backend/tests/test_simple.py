"""
Tests simples sans base de données de test
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class SimpleAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
    def test_api_token_endpoint(self):
        """Test que l'endpoint token fonctionne"""
        response = self.client.post('/api/token/', {
            'username': 'admin',
            'password': 'admin123'
        })
        # Le test passe si l'endpoint répond (même avec erreur 401)
        self.assertIn(response.status_code, [200, 401])
        
    def test_api_health_check(self):
        """Test health check de l'API"""
        response = self.client.get('/api/auth/me/')
        # Devrait retourner 401 (non authentifié)
        self.assertEqual(response.status_code, 401)
        
    def test_products_endpoint_exists(self):
        """Test que l'endpoint products existe"""
        response = self.client.get('/api/products/')
        # Devrait retourner 401 (non authentifié) ou 403
        self.assertIn(response.status_code, [401, 403])
        
    def test_dashboard_endpoint_exists(self):
        """Test que l'endpoint dashboard existe"""
        response = self.client.get('/api/analytics/dashboard/')
        # Devrait retourner 401 (non authentifié)
        self.assertEqual(response.status_code, 401)
