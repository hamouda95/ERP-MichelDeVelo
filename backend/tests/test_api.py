"""
Tests API basiques pour l'ERP
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product, Category
from clients.models import Client

User = get_user_model()

class APITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Créer des données de test
        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            reference='TEST001',
            name='Test Product',
            price_ht=100.00,
            price_ttc=120.00,
            category=self.category
        )
        self.client_obj = Client.objects.create(
            first_name='Test',
            last_name='Client',
            email='client@test.com',
            phone='0612345678'
        )

    def test_get_products(self):
        """Test GET /api/products/"""
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)

    def test_get_clients(self):
        """Test GET /api/clients/"""
        response = self.client.get('/api/clients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)

    def test_create_client(self):
        """Test POST /api/clients/"""
        data = {
            'first_name': 'New',
            'last_name': 'Client',
            'email': 'newclient@test.com',
            'phone': '0623456789'
        }
        response = self.client.post('/api/clients/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Client.objects.count(), 2)

    def test_dashboard_stats(self):
        """Test GET /api/analytics/dashboard/"""
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('totalRevenue', response.data)
        self.assertIn('totalOrders', response.data)

    def test_product_search(self):
        """Test recherche de produits"""
        response = self.client.get('/api/products/?search=Test')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(any(p['name'] == 'Test Product' for p in results))
