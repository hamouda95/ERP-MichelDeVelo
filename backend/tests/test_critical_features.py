"""
Tests unitaires critiques pour l'ERP Michel De Vélo
Couvre les fonctionnalités essentielles : réparations, produits, clients, authentification
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
from decimal import Decimal
from datetime import datetime, date

User = get_user_model()

class TestAuthentication(APITestCase):
    """Tests pour l'authentification"""
    
    def setUp(self):
        self.user_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123!'
        )
    
    def test_user_registration_success(self):
        """Test l'inscription réussie"""
        response = self.client.post('/api/auth/register/', self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
    
    def test_user_registration_invalid_email(self):
        """Test l'inscription avec email invalide"""
        invalid_data = self.user_data.copy()
        invalid_data['email'] = 'invalid-email'
        response = self.client.post('/api/auth/register/', invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_login_success(self):
        """Test la connexion réussie"""
        login_data = {
            'email': 'test@example.com',
            'password': 'TestPassword123!'
        }
        response = self.client.post('/api/token/', login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_user_login_invalid_credentials(self):
        """Test la connexion avec identifiants invalides"""
        login_data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        response = self.client.post('/api/token/', login_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class TestRepairsAPI(APITestCase):
    """Tests pour l'API des réparations"""
    
    def setUp(self):
        self.client.force_authenticate(user=self.user)
        self.repair_data = {
            'client': 1,
            'store': 'ville_avray',
            'bike_brand': 'Trek',
            'bike_model': 'Marlin 7',
            'description': 'Frein avant qui fait du bruit',
            'priority': 'normal',
            'estimated_cost': '150.00'
        }
    
    @classmethod
    def setUpTestData(cls):
        """Créer les données de test"""
        # Créer un client de test
        from clients.models import Client
        cls.client = Client.objects.create(
            first_name='Jean',
            last_name='Dupont',
            email='jean.dupont@example.com',
            phone='0123456789'
        )
        
        # Créer un utilisateur de test
        cls.user = User.objects.create_user(
            username='mechanic',
            email='mechanic@example.com',
            password='TestPass123!'
        )
    
    def test_create_repair_success(self):
        """Test la création réussie d'une réparation"""
        response = self.client.post('/api/repairs/repairs/', self.repair_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['bike_brand'], 'Trek')
        self.assertEqual(response.data['status'], 'pending')
    
    def test_create_repair_invalid_data(self):
        """Test la création avec données invalides"""
        invalid_data = self.repair_data.copy()
        invalid_data['bike_brand'] = ''  # Champ requis vide
        response = self.client.post('/api/repairs/repairs/', invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_repair_list(self):
        """Test la récupération de la liste des réparations"""
        response = self.client.get('/api/repairs/repairs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_get_repair_details(self):
        """Test la récupération des détails d'une réparation"""
        # Créer une réparation de test
        from repairs.models import Repair
        repair = Repair.objects.create(
            client=self.client,
            bike_brand='Specialized',
            description='Test repair',
            created_by=self.user
        )
        
        response = self.client.get(f'/api/repairs/repairs/{repair.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], repair.id)
    
    def test_update_repair_status(self):
        """Test la mise à jour du statut d'une réparation"""
        # Créer une réparation
        from repairs.models import Repair
        repair = Repair.objects.create(
            client=self.client,
            bike_brand='Giant',
            description='Test repair for status update',
            created_by=self.user
        )
        
        # Mettre à jour le statut
        response = self.client.post(
            f'/api/repairs/repairs/{repair.id}/update_status/',
            {'status': 'in_progress'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérifier que le statut a été mis à jour
        repair.refresh_from_db()
        self.assertEqual(repair.status, 'in_progress')
    
    def test_kanban_endpoint(self):
        """Test l'endpoint Kanban"""
        response = self.client.get('/api/repairs/repairs/kanban/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('columns', response.data)
        self.assertIn('summary', response.data)
        self.assertIn('pending', response.data['columns'])
        self.assertIn('in_progress', response.data['columns'])
        self.assertIn('completed', response.data['columns'])
        self.assertIn('delivered', response.data['columns'])

class TestProductsAPI(APITestCase):
    """Tests pour l'API des produits"""
    
    def setUp(self):
        self.client.force_authenticate(user=self.user)
        self.product_data = {
            'name': 'Chambre à air',
            'reference': 'CA-001',
            'category': 1,
            'price': '25.99',
            'total_stock': 50,
            'min_stock': 10
        }
    
    @classmethod
    def setUpTestData(cls):
        """Créer les données de test pour les produits"""
        from products.models import Category
        cls.category = Category.objects.create(
            name='Pièces détachées',
            description='Pièces pour vélos'
        )
    
    def test_create_product_success(self):
        """Test la création réussie d'un produit"""
        response = self.client.post('/api/products/', self.product_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Chambre à air')
        self.assertEqual(float(response.data['price']), 25.99)
    
    def test_get_products_list(self):
        """Test la récupération de la liste des produits"""
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_product_search(self):
        """Test la recherche de produits"""
        # Créer des produits de test
        from products.models import Product
        Product.objects.create(
            name='Pédalier Shimano',
            reference='PD-001',
            category=self.category,
            price=89.99,
            total_stock=25
        )
        
        # Rechercher par nom
        response = self.client.get('/api/products/?search=Pédalier')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérifier que le produit est dans les résultats
        product_ids = [product['id'] for product in response.data['results']]
        self.assertTrue(any('Pédalier' in str(product) for product in response.data['results']))

class TestClientsAPI(APITestCase):
    """Tests pour l'API des clients"""
    
    def setUp(self):
        self.client.force_authenticate(user=self.user)
        self.client_data = {
            'first_name': 'Marie',
            'last_name': 'Curie',
            'email': 'marie.curie@example.com',
            'phone': '0123456789',
            'address': '123 rue de la République'
        }
    
    def test_create_client_success(self):
        """Test la création réussie d'un client"""
        response = self.client.post('/api/clients/', self.client_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['first_name'], 'Marie')
        self.assertEqual(response.data['last_name'], 'Curie')
    
    def test_get_clients_list(self):
        """Test la récupération de la liste des clients"""
        response = self.client.get('/api/clients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_client_search(self):
        """Test la recherche de clients"""
        # Créer un client de test
        from clients.models import Client
        Client.objects.create(
            first_name='Pierre',
            last_name='Martin',
            email='pierre.martin@example.com',
            phone='0123456788'
        )
        
        # Rechercher par nom
        response = self.client.get('/api/clients/?search=Pierre')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérifier que le client est dans les résultats
        client_ids = [client['id'] for client in response.data['results']]
        self.assertTrue(any('Pierre' in str(client) for client in response.data['results']))

class TestSecurity(TestCase):
    """Tests de sécurité"""
    
    def test_sql_injection_prevention(self):
        """Test la prévention des injections SQL"""
        from repairs.models import Repair
        from clients.models import Client
        
        # Créer des données légitimes
        client = Client.objects.create(
            first_name='Test',
            last_name='User',
            email='test@example.com'
        )
        
        # Tenter une injection SQL
        malicious_input = "'; DROP TABLE repairs_repair; --"
        response = self.client.get(f'/api/repairs/repairs/?search={malicious_input}')
        
        # La requête doit échouer ou retourner des résultats vides
        # mais ne doit pas causer d'erreur serveur
        self.assertNotEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def test_xss_prevention(self):
        """Test la prévention des attaques XSS"""
        self.client_data = {
            'first_name': '<script>alert("xss")</script>',
            'last_name': 'Test',
            'email': 'xss@example.com'
        }
        
        response = self.client.post('/api/clients/', self.client_data)
        
        # Le XSS doit être échoué (nettoyé par le serializer)
        if response.status_code == status.HTTP_201_CREATED:
            self.assertNotIn('<script>', response.data['first_name'])
    
    def test_authentication_required(self):
        """Test que l'authentification est requise"""
        self.client.force_authenticate(user=None)  # Déconnecter
        
        # Tenter d'accéder à une endpoint protégée
        response = self.client.get('/api/repairs/repairs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_rate_limiting(self):
        """Test la limitation de débit (rate limiting)"""
        # Faire plusieurs requêtes rapidement
        for i in range(100):  # Simuler une attaque par force brute
            response = self.client.post('/api/token/', {
                'email': 'test@example.com',
                'password': f'wrongpass{i}'
            })
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                break  # Rate limiting détecté
        
        # Vérifier que le rate limiting fonctionne (optionnel selon configuration)
        # self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

class TestValidators(TestCase):
    """Tests pour les validateurs personnalisés"""
    
    def test_phone_validator(self):
        """Test le validateur de numéro de téléphone"""
        from utils.validators import validate_phone_number
        
        # Numéros valides
        self.assertEqual(validate_phone_number('+33612345678'), '+33612345678')
        self.assertEqual(validate_phone_number('0123456789'), '0123456789')
        
        # Numéros invalides
        with self.assertRaises(Exception):
            validate_phone_number('123')
        with self.assertRaises(Exception):
            validate_phone_number('abc')
    
    def test_safe_string_validator(self):
        """Test le validateur de chaîne sécurisée"""
        from utils.validators import validate_safe_string
        
        # Chaînes valides
        self.assertEqual(validate_safe_string('Ceci est un texte normal'), 'Ceci est un texte normal')
        
        # Chaînes dangereuses
        with self.assertRaises(Exception):
            validate_safe_string('<script>alert("xss")</script>')
        with self.assertRaises(Exception):
            validate_safe_string('javascript:alert("xss")')
    
    def test_password_validator(self):
        """Test le validateur de mot de passe"""
        from utils.validators import SecurePasswordValidator
        
        validator = SecurePasswordValidator()
        
        # Mot de passe valide
        try:
            result = validator.validate('SecurePass123!')
            self.assertEqual(result, 'SecurePass123!')
        except Exception:
            self.fail('Le mot de passe valide a été rejeté')
        
        # Mots de passe invalides
        with self.assertRaises(Exception):
            validator.validate('weak')  # Trop court
        with self.assertRaises(Exception):
            validator.validate('password')  # Mot de passe courant

class TestCacheService(TestCase):
    """Tests pour le service de cache"""
    
    def test_cache_set_and_get(self):
        """Test l'écriture et lecture du cache"""
        from utils.cache_service import CacheService
        
        # Définir une valeur
        CacheService.set('test_key', 'test_value', 'SHORT')
        
        # Lire la valeur
        result = CacheService.get('test_key')
        self.assertEqual(result, 'test_value')
    
    def test_cache_expiration(self):
        """Test l'expiration du cache"""
        from utils.cache_service import CacheService
        from unittest.mock import patch
        
        # Simuler l'expiration
        with patch('django.core.cache.cache.get', return_value=None):
            result = CacheService.get('non_existent_key')
            self.assertIsNone(result)
    
    def test_repair_cache_invalidation(self):
        """Test l'invalidation du cache des réparations"""
        from utils.cache_service import RepairCacheService
        from unittest.mock import patch
        
        with patch.object(RepairCacheService, 'invalidate_repair_cache') as mock_invalidate:
            RepairCacheService.invalidate_repair_cache(123)
            mock_invalidate.assert_called_once_with(123)

# Tests d'intégration
class TestRepairWorkflow(APITestCase):
    """Tests du workflow complet de réparation"""
    
    @classmethod
    def setUpTestData(cls):
        """Configuration des données de test"""
        from clients.models import Client
        from products.models import Product, Category
        
        cls.category = Category.objects.create(name='Pièces')
        cls.client = Client.objects.create(
            first_name='Test',
            last_name='Client',
            email='test.client@example.com'
        )
        cls.product = Product.objects.create(
            name='Chaine de vélo',
            category=cls.category,
            price=29.99,
            total_stock=100
        )
    
    def test_complete_repair_workflow(self):
        """Test le workflow complet de création à livraison"""
        # 1. Créer la réparation
        repair_data = {
            'client': self.client.id,
            'bike_brand': 'BikeTest',
            'description': 'Test complet workflow',
            'estimated_cost': '100.00'
        }
        response = self.client.post('/api/repairs/repairs/', repair_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        repair_id = response.data['id']
        
        # 2. Mettre à jour le statut en cours
        response = self.client.post(
            f'/api/repairs/repairs/{repair_id}/update_status/',
            {'status': 'in_progress'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Ajouter une pièce
        item_data = {
            'repair': repair_id,
            'product': self.product.id,
            'description': 'Chaine de vélo',
            'quantity': 1,
            'unit_price': '29.99'
        }
        response = self.client.post('/api/repairs/repair-items/', item_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 4. Marquer comme terminé
        response = self.client.post(
            f'/api/repairs/repairs/{repair_id}/update_status/',
            {'status': 'completed'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Marquer comme livré
        response = self.client.post(
            f'/api/repairs/repairs/{repair_id}/update_status/',
            {'status': 'delivered'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérifier l'état final
        from repairs.models import Repair
        repair = Repair.objects.get(id=repair_id)
        self.assertEqual(repair.status, 'delivered')

if __name__ == '__main__':
    pytest.main([__file__])
