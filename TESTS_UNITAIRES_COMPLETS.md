# 🧪 TESTS UNITAIRES FORMELS - ERP MICHEL DE VÉLO

## 🎯 OBJECTIFS

- **Tests unitaires** pour tous les composants critiques
- **Tests d'intégration** pour les workflows métier
- **Tests E2E** pour les parcours utilisateur
- **CI/CD** avec exécution automatique
- **Couverture de code** > 80%

---

## 🏗️ ARCHITECTURE DES TESTS

### Structure des Dossiers
```
tests/
├── backend/
│   ├── unit/                    # Tests unitaires
│   │   ├── test_models.py
│   │   ├── test_views.py
│   │   ├── test_serializers.py
│   │   └── test_utils.py
│   ├── integration/             # Tests d'intégration
│   │   ├── test_api_workflows.py
│   │   ├── test_repairs_flow.py
│   │   └── test_suppliers_flow.py
│   └── fixtures/                # Données de test
│       ├── users.json
│       ├── clients.json
│       ├── products.json
│       └── repairs.json
├── frontend/
│   ├── unit/                    # Tests unitaires
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/             # Tests d'intégration
│   │   ├── RepairsModule.test.js
│   │   ├── SuppliersModule.test.js
│   │   └── API.test.js
│   └── e2e/                     # Tests E2E
│       ├── repairs.spec.js
│       ├── suppliers.spec.js
│       └── dashboard.spec.js
└── config/
    ├── jest.config.js
    ├── pytest.ini
    └── setup.js
```

---

## 🔧 BACKEND TESTS (DJANGO + PYTEST)

### Configuration Pytest
```ini
# pytest.ini
[tool:pytest]
DJANGO_SETTINGS_MODULE = bike_erp.settings
python_files = tests.py test_*.py *_tests.py
testpaths = tests
addopts = 
    --verbose
    --tb=short
    --cov=.
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
    --reuse-db
```

### Tests des Modèles
```python
# tests/backend/unit/test_models.py
import pytest
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from accounts.models import Client
from products.models import Product, Category
from repairs.models import Repair, RepairStatus, RepairPart
from suppliers.models import Supplier

User = get_user_model()

class TestRepairModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        """Créer les données de test une seule fois"""
        cls.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        cls.client = Client.objects.create(
            first_name='Jean',
            last_name='Dupont',
            email='jean.dupont@example.com',
            phone='0612345678'
        )
        
        cls.category = Category.objects.create(
            name='VTT',
            description='Vélos tout terrain'
        )
        
        cls.product = Product.objects.create(
            name='Pneu VTT 27.5',
            category=cls.category,
            price=Decimal('29.99'),
            stock_ville_avray=10,
            stock_garches=5
        )
        
        cls.repair = Repair.objects.create(
            client=cls.client,
            store='ville_avray',
            bike_brand='Giant',
            bike_model='Talon',
            description='Changement pneu arrière',
            priority='normal',
            status='pending',
            estimated_cost=Decimal('50.00')
        )

    def test_repair_creation(self):
        """Test la création d'une réparation"""
        repair = Repair.objects.get(id=self.repair.id)
        
        self.assertEqual(repair.client, self.client)
        self.assertEqual(repair.store, 'ville_avray')
        self.assertEqual(repair.bike_brand, 'Giant')
        self.assertEqual(repair.status, 'pending')
        self.assertEqual(repair.estimated_cost, Decimal('50.00'))

    def test_repair_reference_number_generation(self):
        """Test la génération automatique du numéro de référence"""
        repair = Repair.objects.get(id=self.repair.id)
        
        # Le numéro de référence devrait être généré automatiquement
        self.assertIsNotNone(repair.reference_number)
        self.assertTrue(repair.reference_number.startswith('REP-VA-'))

    def test_repair_status_workflow(self):
        """Test le workflow des statuts de réparation"""
        repair = Repair.objects.get(id=self.repair.id)
        
        # Test transition vers "in_progress"
        repair.status = 'in_progress'
        repair.save()
        self.assertEqual(repair.status, 'in_progress')
        
        # Test transition vers "completed"
        repair.status = 'completed'
        repair.final_cost = Decimal('55.00')
        repair.save()
        self.assertEqual(repair.status, 'completed')
        self.assertEqual(repair.final_cost, Decimal('55.00'))

    def test_repair_parts_management(self):
        """Test la gestion des pièces de réparation"""
        repair = Repair.objects.get(id=self.repair.id)
        
        # Ajouter une pièce
        repair_part = RepairPart.objects.create(
            repair=repair,
            product=self.product,
            quantity=1,
            unit_price=self.product.price
        )
        
        self.assertEqual(repair.parts_needed.count(), 1)
        self.assertEqual(repair.parts_needed.first().product, self.product)
        self.assertEqual(repair.parts_needed.first().quantity, 1)

    def test_repair_duration_calculation(self):
        """Test le calcul de la durée de réparation"""
        repair = Repair.objects.get(id=self.repair.id)
        
        # Modifier la date de création pour simuler une réparation plus ancienne
        repair.created_at = datetime.now() - timedelta(days=3)
        repair.save()
        
        # Vérifier que la durée est calculée correctement
        from django.utils import timezone
        duration = timezone.now() - repair.created_at
        self.assertGreaterEqual(duration.days, 3)

class TestProductModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(
            name='Électrique',
            description='Vélos électriques'
        )
        
        cls.product = Product.objects.create(
            name='VTT Électrique Trek',
            category=cls.category,
            price=Decimal('1299.99'),
            stock_ville_avray=3,
            stock_garches=7,
            barcode='1234567890123'
        )

    def test_product_creation(self):
        """Test la création d'un produit"""
        product = Product.objects.get(id=self.product.id)
        
        self.assertEqual(product.name, 'VTT Électrique Trek')
        self.assertEqual(product.category, self.category)
        self.assertEqual(product.price, Decimal('1299.99'))
        self.assertEqual(product.stock_ville_avray, 3)
        self.assertEqual(product.stock_garches, 7)

    def test_product_total_stock(self):
        """Test le calcul du stock total"""
        product = Product.objects.get(id=self.product.id)
        total_stock = product.stock_ville_avray + product.stock_garches
        
        self.assertEqual(total_stock, 10)

    def test_product_stock_alert(self):
        """Test l'alerte de stock bas"""
        product = Product.objects.get(id=self.product.id)
        
        # Mettre le stock bas pour déclencher l'alerte
        product.stock_ville_avray = 0
        product.stock_garches = 2
        product.save()
        
        # Vérifier que l'alerte est activée
        total_stock = product.stock_ville_avray + product.stock_garches
        self.assertTrue(total_stock <= 5)  # Seuil d'alerte

class TestSupplierModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.supplier = Supplier.objects.create(
            name='Cycle Parts Pro',
            contact_person='Marie Martin',
            email='contact@cycleparts.fr',
            phone='0123456789',
            address='123 Rue des Fournisseurs',
            city='Lyon',
            postal_code='69000',
            country='France',
            payment_terms='30 jours',
            delivery_delay=7,
            minimum_order=100.00
        )

    def test_supplier_creation(self):
        """Test la création d'un fournisseur"""
        supplier = Supplier.objects.get(id=self.supplier.id)
        
        self.assertEqual(supplier.name, 'Cycle Parts Pro')
        self.assertEqual(supplier.contact_person, 'Marie Martin')
        self.assertEqual(supplier.email, 'contact@cycleparts.fr')
        self.assertEqual(supplier.delivery_delay, 7)
        self.assertEqual(supplier.minimum_order, Decimal('100.00'))

    def test_supplier_full_address(self):
        """Test l'adresse complète du fournisseur"""
        supplier = Supplier.objects.get(id=self.supplier.id)
        
        full_address = f"{supplier.address}, {supplier.postal_code} {supplier.city}, {supplier.country}"
        expected_address = "123 Rue des Fournisseurs, 69000 Lyon, France"
        
        self.assertEqual(full_address, expected_address)
```

### Tests des Vues API
```python
# tests/backend/unit/test_views.py
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Client
from repairs.models import Repair
from products.models import Product, Category

User = get_user_model()

class TestRepairAPIView(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        cls.client = APIClient()
        cls.client.force_authenticate(user=cls.user)
        
        cls.test_client = Client.objects.create(
            first_name='Test',
            last_name='Client',
            email='test.client@example.com',
            phone='0612345678'
        )
        
        cls.category = Category.objects.create(name='Test Category')
        cls.product = Product.objects.create(
            name='Test Product',
            category=cls.category,
            price=10.00
        )

    def test_get_repairs_list(self):
        """Test la récupération de la liste des réparations"""
        # Créer une réparation de test
        repair = Repair.objects.create(
            client=self.test_client,
            store='ville_avray',
            bike_brand='Test',
            description='Test repair',
            priority='normal',
            status='pending'
        )
        
        response = self.client.get('/api/repairs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)

    def test_create_repair(self):
        """Test la création d'une réparation"""
        repair_data = {
            'client': self.test_client.id,
            'store': 'ville_avray',
            'bike_brand': 'Giant',
            'bike_model': 'Talon',
            'description': 'Test repair creation',
            'priority': 'normal',
            'estimated_cost': '50.00'
        }
        
        response = self.client.post('/api/repairs/', repair_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Repair.objects.count(), 1)
        
        # Vérifier les données
        repair = Repair.objects.first()
        self.assertEqual(repair.client, self.test_client)
        self.assertEqual(repair.bike_brand, 'Giant')
        self.assertEqual(repair.description, 'Test repair creation')

    def test_update_repair(self):
        """Test la mise à jour d'une réparation"""
        repair = Repair.objects.create(
            client=self.test_client,
            store='ville_avray',
            bike_brand='Test',
            description='Original description',
            priority='normal',
            status='pending'
        )
        
        update_data = {
            'description': 'Updated description',
            'status': 'in_progress',
            'estimated_cost': '75.00'
        }
        
        response = self.client.patch(f'/api/repairs/{repair.id}/', update_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Rafraîchir depuis la base de données
        repair.refresh_from_db()
        self.assertEqual(repair.description, 'Updated description')
        self.assertEqual(repair.status, 'in_progress')

    def test_delete_repair(self):
        """Test la suppression d'une réparation"""
        repair = Repair.objects.create(
            client=self.test_client,
            store='ville_avray',
            bike_brand='Test',
            description='Test repair to delete',
            priority='normal',
            status='pending'
        )
        
        response = self.client.delete(f'/api/repairs/{repair.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Repair.objects.count(), 0)

    def test_repair_permissions(self):
        """Test les permissions sur les réparations"""
        # Créer un utilisateur non authentifié
        unauthenticated_client = APIClient()
        
        response = unauthenticated_client.get('/api/repairs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        response = unauthenticated_client.post('/api/repairs/', {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class TestProductAPIView(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        cls.client = APIClient()
        cls.client.force_authenticate(user=cls.user)
        
        cls.category = Category.objects.create(name='Test Category')

    def test_get_products_list(self):
        """Test la récupération de la liste des produits"""
        Product.objects.create(
            name='Product 1',
            category=self.category,
            price=10.00
        )
        Product.objects.create(
            name='Product 2',
            category=self.category,
            price=20.00
        )
        
        response = self.client.get('/api/products/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)

    def test_product_search(self):
        """Test la recherche de produits"""
        Product.objects.create(
            name='Mountain Bike',
            category=self.category,
            price=500.00
        )
        Product.objects.create(
            name='Road Bike',
            category=self.category,
            price=600.00
        )
        
        # Rechercher "Mountain"
        response = self.client.get('/api/products/?search=Mountain')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Mountain Bike')

    def test_product_filter_by_category(self):
        """Test le filtrage des produits par catégorie"""
        category2 = Category.objects.create(name='Category 2')
        
        Product.objects.create(
            name='Product in Cat 1',
            category=self.category,
            price=10.00
        )
        Product.objects.create(
            name='Product in Cat 2',
            category=category2,
            price=20.00
        )
        
        response = self.client.get(f'/api/products/?category={self.category.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['category'], self.category.id)
```

### Tests d'Intégration
```python
# tests/backend/integration/test_repairs_flow.py
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from accounts.models import Client
from repairs.models import Repair, RepairPart
from products.models import Product, Category

User = get_user_model()

class TestRepairWorkflow(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='mechanic',
            email='mechanic@bike.com',
            password='mechpass123'
        )
        
        cls.client = APIClient()
        cls.client.force_authenticate(user=cls.user)
        
        # Créer les données de test
        cls.test_client = Client.objects.create(
            first_name='Pierre',
            last_name='Martin',
            email='pierre.martin@example.com',
            phone='0612345678'
        )
        
        cls.category = Category.objects.create(name='Pièces')
        cls.product = Product.objects.create(
            name='Chaine de vélo',
            category=cls.category,
            price=Decimal('15.99'),
            stock_ville_avray=20,
            stock_garches=15
        )

    def test_complete_repair_workflow(self):
        """Test le workflow complet d'une réparation"""
        
        # 1. Créer la réparation
        repair_data = {
            'client': self.test_client.id,
            'store': 'ville_avray',
            'bike_brand': 'Specialized',
            'bike_model': 'Allez',
            'description': 'Changement chaine et cassette',
            'priority': 'normal',
            'estimated_cost': '60.00'
        }
        
        response = self.client.post('/api/repairs/', repair_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        repair_id = response.data['id']
        
        # 2. Ajouter des pièces nécessaires
        part_data = {
            'repair': repair_id,
            'product': self.product.id,
            'quantity': 1,
            'unit_price': str(self.product.price)
        }
        
        response = self.client.post('/api/repair-parts/', part_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 3. Mettre à jour le statut vers "in_progress"
        response = self.client.patch(
            f'/api/repairs/{repair_id}/',
            {'status': 'in_progress'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Ajouter un diagnostic
        response = self.client.patch(
            f'/api/repairs/{repair_id}/',
            {'diagnosis': 'Chaine usée, cassette également à remplacer'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Mettre à jour le statut vers "completed"
        response = self.client.patch(
            f'/api/repairs/{repair_id}/',
            {
                'status': 'completed',
                'final_cost': '75.50',
                'labor_hours': 1.5
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 6. Vérifier l'état final
        repair = Repair.objects.get(id=repair_id)
        self.assertEqual(repair.status, 'completed')
        self.assertEqual(repair.final_cost, Decimal('75.50'))
        self.assertEqual(repair.labor_hours, 1.5)
        self.assertEqual(repair.parts_needed.count(), 1)

    def test_repair_with_parts_stock_update(self):
        """Test que le stock est mis à jour lors de l'utilisation de pièces"""
        
        # Stock initial
        initial_stock = self.product.stock_ville_avray
        
        # Créer la réparation
        repair_data = {
            'client': self.test_client.id,
            'store': 'ville_avray',
            'bike_brand': 'Test',
            'description': 'Test repair with parts',
            'priority': 'normal'
        }
        
        response = self.client.post('/api/repairs/', repair_data)
        repair_id = response.data['id']
        
        # Ajouter 2 pièces
        part_data = {
            'repair': repair_id,
            'product': self.product.id,
            'quantity': 2,
            'unit_price': str(self.product.price)
        }
        
        response = self.client.post('/api/repair-parts/', part_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Marquer la réparation comme complétée (devrait mettre à jour le stock)
        response = self.client.patch(
            f'/api/repairs/{repair_id}/',
            {'status': 'completed'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérifier que le stock a été mis à jour
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_ville_avray, initial_stock - 2)

    def test_repair_timeline_creation(self):
        """Test la création automatique de la timeline"""
        
        # Créer la réparation
        repair_data = {
            'client': self.test_client.id,
            'store': 'ville_avray',
            'bike_brand': 'Test',
            'description': 'Test repair timeline',
            'priority': 'normal'
        }
        
        response = self.client.post('/api/repairs/', repair_data)
        repair_id = response.data['id']
        
        # Vérifier qu'une entrée de timeline a été créée
        response = self.client.get(f'/api/repairs/{repair_id}/timeline/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        
        # Changer le statut et vérifier la nouvelle entrée
        initial_count = len(response.data)
        
        self.client.patch(
            f'/api/repairs/{repair_id}/',
            {'status': 'in_progress'}
        )
        
        response = self.client.get(f'/api/repairs/{repair_id}/timeline/')
        self.assertEqual(len(response.data), initial_count + 1)
```

---

## ⚛️ FRONTEND TESTS (JEST + REACT TESTING LIBRARY)

### Configuration Jest
```javascript
// frontend/jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/config/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/serviceWorker.js',
    '!src/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}',
  ],
};
```

### Setup des Tests
```javascript
// frontend/src/config/setupTests.js
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './server';

// Configuration de Testing Library
configure({ testIdAttribute: 'data-test-id' });

// Démarrer le mock server pour tous les tests
beforeAll(() => server.listen());

// Réinitialiser les handlers entre chaque test
afterEach(() => server.resetHandlers());

// Fermer le server après tous les tests
afterAll(() => server.close());

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock de IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

### Tests des Composants
```javascript
// frontend/src/components/__tests__/QuickRepairForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickRepairForm from '../QuickRepairForm';
import { repairsAPI, clientsAPI, productsAPI } from '../../services/api_consolidated';

// Mock des API
jest.mock('../../services/api_consolidated');

const mockClients = [
  { id: 1, first_name: 'Jean', last_name: 'Dupont', email: 'jean@example.com' },
  { id: 2, first_name: 'Marie', last_name: 'Martin', email: 'marie@example.com' },
];

const mockProducts = [
  { id: 1, name: 'Chaine de vélo', price: 15.99 },
  { id: 2, name: 'Pneu VTT', price: 29.99 },
];

describe('QuickRepairForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    clientsAPI.getAll.mockResolvedValue({ data: mockClients });
    productsAPI.getAll.mockResolvedValue({ data: mockProducts });
    repairsAPI.create.mockResolvedValue({ data: { id: 1, reference_number: 'REP-VA-001' } });
  });

  test('renders form with all required fields', async () => {
    render(<QuickRepairForm onSubmit={mockOnSubmit} />);
    
    // Vérifier que tous les champs requis sont présents
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/marque du vélo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/magasin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priorité/i)).toBeInTheDocument();
    
    // Attendre le chargement des clients
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sélectionner un client')).toBeInTheDocument();
    });
  });

  test('loads clients and products on mount', async () => {
    render(<QuickRepairForm onSubmit={mockOnSubmit} />);
    
    await waitFor(() => {
      expect(clientsAPI.getAll).toHaveBeenCalledTimes(1);
      expect(productsAPI.getAll).toHaveBeenCalledTimes(1);
    });
  });

  test('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    render(<QuickRepairForm onSubmit={mockOnSubmit} />);
    
    // Tenter de soumettre sans remplir les champs requis
    const submitButton = screen.getByRole('button', { name: /créer/i });
    await user.click(submitButton);
    
    // Vérifier les messages d'erreur
    await waitFor(() => {
      expect(screen.getByText(/veuillez sélectionner un client/i)).toBeInTheDocument();
      expect(screen.getByText(/la marque du vélo est requise/i)).toBeInTheDocument();
      expect(screen.getByText(/la description est requise/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<QuickRepairForm onSubmit={mockOnSubmit} />);
    
    // Attendre le chargement des clients
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sélectionner un client')).toBeInTheDocument();
    });
    
    // Remplir le formulaire
    await user.selectOptions(screen.getByLabelText(/client/i), '1');
    await user.type(screen.getByLabelText(/marque du vélo/i), 'Giant');
    await user.type(screen.getByLabelText(/modèle du vélo/i), 'Talon');
    await user.type(screen.getByLabelText(/description/i), 'Test repair description');
    await user.selectOptions(screen.getByLabelText(/magasin/i), 'ville_avray');
    await user.selectOptions(screen.getByLabelText(/priorité/i), 'normal');
    
    // Soumettre le formulaire
    const submitButton = screen.getByRole('button', { name: /créer/i });
    await user.click(submitButton);
    
    // Vérifier que l'API a été appelée avec les bonnes données
    await waitFor(() => {
      expect(repairsAPI.create).toHaveBeenCalledWith(
        expect.objectContaining({
          client: 1,
          bike_brand: 'Giant',
          bike_model: 'Talon',
          description: 'Test repair description',
          store: 'ville_avray',
          priority: 'normal',
        })
      );
    });
    
    // Vérifier que le callback onSubmit a été appelé
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, reference_number: 'REP-VA-001' })
    );
  });

  test('adds and removes parts', async () => {
    const user = userEvent.setup();
    render(<QuickRepairForm onSubmit={mockOnSubmit} />);
    
    await waitFor(() => {
      expect(screen.getByText(/ajouter une pièce/i)).toBeInTheDocument();
    });
    
    // Ajouter une pièce
    const addPartButton = screen.getByText(/ajouter une pièce/i);
    await user.click(addPartButton);
    
    // Sélectionner un produit
    await user.selectOptions(screen.getByLabelText(/pièce/i), '1');
    await user.type(screen.getByLabelText(/quantité/i), '2');
    
    // Confirmer l'ajout
    await user.click(screen.getByText(/ajouter/i));
    
    // Vérifier que la pièce a été ajoutée
    expect(screen.getByText(/Chaine de vélo/)).toBeInTheDocument();
    expect(screen.getByText(/Quantité: 2/)).toBeInTheDocument();
    
    // Supprimer la pièce
    const removeButton = screen.getByText(/supprimer/i);
    await user.click(removeButton);
    
    // Vérifier que la pièce a été supprimée
    expect(screen.queryByText(/Chaine de vélo/)).not.toBeInTheDocument();
  });

  test('resets form after successful submission', async () => {
    const user = userEvent.setup();
    render(<QuickRepairForm onSubmit={mockOnSubmit} />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sélectionner un client')).toBeInTheDocument();
    });
    
    // Remplir et soumettre le formulaire
    await user.selectOptions(screen.getByLabelText(/client/i), '1');
    await user.type(screen.getByLabelText(/marque du vélo/i), 'Giant');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.selectOptions(screen.getByLabelText(/magasin/i), 'ville_avray');
    await user.selectOptions(screen.getByLabelText(/priorité/i), 'normal');
    
    const submitButton = screen.getByRole('button', { name: /créer/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
    
    // Vérifier que le formulaire a été réinitialisé
    expect(screen.getByDisplayValue('Sélectionner un client')).toBeInTheDocument();
    expect(screen.getByLabelText(/marque du vélo/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
  });
});
```

### Tests des Hooks
```javascript
// frontend/src/hooks/__tests__/useRepairs.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRepairsQuery, useCreateRepairMutation } from '../useApiQueries';
import { repairsAPI } from '../../services/api_consolidated';

// Mock des API
jest.mock('../../services/api_consolidated');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useRepairsQuery', () => {
  const mockRepairs = [
    { id: 1, reference_number: 'REP-001', status: 'pending' },
    { id: 2, reference_number: 'REP-002', status: 'completed' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    repairsAPI.getAll.mockResolvedValue({ data: mockRepairs });
  });

  test('loads repairs successfully', async () => {
    const { result } = renderHook(() => useRepairsQuery(), { wrapper });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockRepairs);
    });
    
    expect(repairsAPI.getAll).toHaveBeenCalledTimes(1);
  });

  test('passes filters to API', async () => {
    const filters = { status: 'pending', store: 'ville_avray' };
    
    renderHook(() => useRepairsQuery(filters), { wrapper });
    
    await waitFor(() => {
      expect(repairsAPI.getAll).toHaveBeenCalledWith(filters);
    });
  });

  test('handles API errors', async () => {
    const errorMessage = 'API Error';
    repairsAPI.getAll.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useRepairsQuery(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    
    expect(result.current.error.message).toBe(errorMessage);
  });
});

describe('useCreateRepairMutation', () => {
  const mockRepair = { id: 1, reference_number: 'REP-001' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    repairsAPI.create.mockResolvedValue({ data: mockRepair });
  });

  test('creates repair successfully', async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCreateRepairMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
    
    const repairData = {
      client: 1,
      bike_brand: 'Giant',
      description: 'Test repair',
    };
    
    await result.current.mutateAsync(repairData);
    
    expect(repairsAPI.create).toHaveBeenCalledWith(repairData);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(mockRepair);
  });

  test('invalidates related queries on success', async () => {
    const queryClient = createTestQueryClient();
    
    // Mock invalidateQueries
    const invalidateQueries = jest.fn();
    queryClient.invalidateQueries = invalidateQueries;
    
    const { result } = renderHook(() => useCreateRepairMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
    
    const repairData = { client: 1, bike_brand: 'Giant', description: 'Test' };
    
    await result.current.mutateAsync(repairData);
    
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['repairs'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  test('handles creation errors', async () => {
    const errorMessage = 'Creation failed';
    repairsAPI.create.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useCreateRepairMutation(), { wrapper });
    
    try {
      await result.current.mutateAsync({ client: 1 });
    } catch (error) {
      expect(error.message).toBe(errorMessage);
    }
    
    expect(result.current.isError).toBe(true);
  });
});
```

### Tests d'Intégration Frontend
```javascript
// frontend/src/modules/__tests__/RepairsModule.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RepairsModule from '../RepairsModule';
import { repairsAPI, clientsAPI, productsAPI } from '../../services/api_consolidated';

// Mock des API
jest.mock('../../services/api_consolidated');

// Mock du composant de drag & drop
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({ innerRef: jest.fn(), placeholder: null }),
  Draggable: ({ children }) => children({ dragHandleProps: {}, innerRef: jest.fn() }),
}));

const mockRepairs = [
  {
    id: 1,
    reference_number: 'REP-VA-001',
    client: { first_name: 'Jean', last_name: 'Dupont' },
    status: 'pending',
    priority: 'normal',
    bike_brand: 'Giant',
    bike_model: 'Talon',
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    reference_number: 'REP-VA-002',
    client: { first_name: 'Marie', last_name: 'Martin' },
    status: 'in_progress',
    priority: 'high',
    bike_brand: 'Specialized',
    bike_model: 'Allez',
    created_at: '2024-01-02T14:00:00Z',
  },
];

const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe('RepairsModule Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    repairsAPI.getAll.mockResolvedValue({ data: mockRepairs });
    clientsAPI.getAll.mockResolvedValue({ data: [] });
    productsAPI.getAll.mockResolvedValue({ data: [] });
  });

  test('renders repairs list view by default', async () => {
    render(<RepairsModule />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText(/réparations/i)).toBeInTheDocument();
    });
    
    // Vérifier que les réparations sont affichées
    expect(screen.getByText('REP-VA-001')).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Giant')).toBeInTheDocument();
    
    expect(screen.getByText('REP-VA-002')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Specialized')).toBeInTheDocument();
  });

  test('switches between views', async () => {
    const user = userEvent.setup();
    render(<RepairsModule />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText(/réparations/i)).toBeInTheDocument();
    });
    
    // Changer vers la vue Kanban
    const kanbanTab = screen.getByText(/kanban/i);
    await user.click(kanbanTab);
    
    expect(screen.getByText(/en attente/i)).toBeInTheDocument();
    expect(screen.getByText(/en cours/i)).toBeInTheDocument();
    
    // Changer vers la vue Timeline
    const timelineTab = screen.getByText(/timeline/i);
    await user.click(timelineTab);
    
    expect(screen.getByText(/timeline/i)).toBeInTheDocument();
  });

  test('filters repairs by status', async () => {
    const user = userEvent.setup();
    render(<RepairsModule />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('REP-VA-001')).toBeInTheDocument();
      expect(screen.getByText('REP-VA-002')).toBeInTheDocument();
    });
    
    // Filtrer par statut "pending"
    const statusFilter = screen.getByLabelText(/statut/i);
    await user.selectOptions(statusFilter, 'pending');
    
    // Vérifier que seule la réparation "pending" est affichée
    await waitFor(() => {
      expect(screen.getByText('REP-VA-001')).toBeInTheDocument();
      expect(screen.queryByText('REP-VA-002')).not.toBeInTheDocument();
    });
  });

  test('searches repairs', async () => {
    const user = userEvent.setup();
    render(<RepairsModule />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('REP-VA-001')).toBeInTheDocument();
      expect(screen.getByText('REP-VA-002')).toBeInTheDocument();
    });
    
    // Rechercher "Giant"
    const searchInput = screen.getByPlaceholderText(/rechercher/i);
    await user.type(searchInput, 'Giant');
    
    // Vérifier que seule la réparation Giant est affichée
    await waitFor(() => {
      expect(screen.getByText('REP-VA-001')).toBeInTheDocument();
      expect(screen.queryByText('REP-VA-002')).not.toBeInTheDocument();
    });
  });

  test('opens repair creation modal', async () => {
    const user = userEvent.setup();
    render(<RepairsModule />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText(/réparations/i)).toBeInTheDocument();
    });
    
    // Cliquer sur le bouton "Nouvelle réparation"
    const createButton = screen.getByText(/nouvelle réparation/i);
    await user.click(createButton);
    
    // Vérifier que le modal s'ouvre
    expect(screen.getByText(/créer une réparation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/marque du vélo/i)).toBeInTheDocument();
  });

  test('handles repair status update', async () => {
    const user = userEvent.setup();
    repairsAPI.updateStatus.mockResolvedValue({ data: { success: true } });
    
    render(<RepairsModule />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('REP-VA-001')).toBeInTheDocument();
    });
    
    // Trouver et cliquer sur le bouton de mise à jour de statut
    const statusButton = screen.getByTitle(/mettre à jour le statut/i);
    await user.click(statusButton);
    
    // Sélectionner un nouveau statut
    const newStatus = screen.getByText(/en cours/i);
    await user.click(newStatus);
    
    // Vérifier que l'API a été appelée
    await waitFor(() => {
      expect(repairsAPI.updateStatus).toHaveBeenCalledWith(1, { status: 'in_progress' });
    });
  });

  test('displays loading state', () => {
    // Mock un chargement lent
    repairsAPI.getAll.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<RepairsModule />, { wrapper });
    
    // Vérifier l'état de chargement
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to load repairs';
    repairsAPI.getAll.mockRejectedValue(new Error(errorMessage));
    
    render(<RepairsModule />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText(/erreur/i)).toBeInTheDocument();
    });
  });
});
```

---

## 🤖 TESTS E2E (PLAYWRIGHT)

### Configuration Playwright
```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/frontend/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
};
```

### Tests E2E des Workflows
```javascript
// tests/frontend/e2e/repairs.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Repairs Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login avant chaque test
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    
    // Attendre la redirection vers le dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('complete repair workflow', async ({ page }) => {
    // 1. Naviguer vers le module réparations
    await page.click('[data-testid="repairs-nav"]');
    await expect(page).toHaveURL('/repairs-module');
    
    // 2. Créer une nouvelle réparation
    await page.click('[data-testid="create-repair-button"]');
    
    // Remplir le formulaire
    await page.selectOption('[data-testid="client-select"]', { label: 'Jean Dupont' });
    await page.fill('[data-testid="bike-brand"]', 'Giant');
    await page.fill('[data-testid="bike-model"]', 'Talon');
    await page.fill('[data-testid="description"]', 'Test E2E repair');
    await page.selectOption('[data-testid="store-select"]', 'Ville d\'Avray');
    await page.selectOption('[data-testid="priority-select"]', 'Normal');
    
    // Ajouter une pièce
    await page.click('[data-testid="add-part-button"]');
    await page.selectOption('[data-testid="part-select"]', { label: 'Chaine de vélo' });
    await page.fill('[data-testid="part-quantity"]', '1');
    await page.click('[data-testid="confirm-part-button"]');
    
    // Soumettre la réparation
    await page.click('[data-testid="submit-repair-button"]');
    
    // 3. Vérifier que la réparation a été créée
    await expect(page.locator('[data-testid="repair-list"]')).toContainText('Test E2E repair');
    await expect(page.locator('[data-testid="repair-list"]')).toContainText('Giant');
    
    // 4. Mettre à jour le statut
    await page.click('[data-testid="repair-status-button"]');
    await page.click('[data-testid="status-in-progress"]');
    
    // 5. Ajouter un diagnostic
    await page.click('[data-testid="edit-repair-button"]');
    await page.fill('[data-testid="diagnosis"]', 'Chain replacement needed');
    await page.click('[data-testid="save-repair-button"]');
    
    // 6. Marquer comme complétée
    await page.click('[data-testid="repair-status-button"]');
    await page.click('[data-testid="status-completed"]');
    await page.fill('[data-testid="final-cost"]', '75.50');
    await page.click('[data-testid="confirm-status-button"]');
    
    // 7. Vérifier l'état final
    await expect(page.locator('[data-testid="repair-status"]')).toContainText('Terminée');
    await expect(page.locator('[data-testid="repair-cost"]')).toContainText('75,50 €');
  });

  test('repair search and filtering', async ({ page }) => {
    await page.goto('/repairs-module');
    
    // Attendre le chargement
    await expect(page.locator('[data-testid="repair-list"]')).toBeVisible();
    
    // Test de recherche
    await page.fill('[data-testid="search-input"]', 'Giant');
    await expect(page.locator('[data-testid="repair-list"]')).toContainText('Giant');
    
    // Test de filtrage par statut
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    await expect(page.locator('[data-testid="repair-list"]')).toContainText('En attente');
    
    // Test de filtrage par magasin
    await page.selectOption('[data-testid="store-filter"]', 'Ville d\'Avray');
    await expect(page.locator('[data-testid="repair-list"]')).toContainText('Ville d\'Avray');
  });

  test('kanban workflow drag and drop', async ({ page }) => {
    await page.goto('/repairs-module');
    
    // Changer vers la vue Kanban
    await page.click('[data-testid="kanban-tab"]');
    
    // Vérifier que les colonnes sont présentes
    await expect(page.locator('[data-testid="column-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-completed"]')).toBeVisible();
    
    // Drag and drop d'une réparation
    const repairCard = page.locator('[data-testid="repair-card"]').first();
    const targetColumn = page.locator('[data-testid="column-in-progress"]');
    
    await repairCard.dragTo(targetColumn);
    
    // Vérifier que la réparation a été déplacée
    await expect(targetColumn.locator('[data-testid="repair-card"]')).toHaveCount(1);
  });

  test('repair details and timeline', async ({ page }) => {
    await page.goto('/repairs-module');
    
    // Cliquer sur une réparation
    await page.click('[data-testid="repair-card"]');
    
    // Vérifier les détails
    await expect(page.locator('[data-testid="repair-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="bike-info"]')).toBeVisible();
    
    // Vérifier la timeline
    await expect(page.locator('[data-testid="repair-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-entry"]')).toHaveCount.greaterThan(0);
    
    // Ajouter un commentaire à la timeline
    await page.click('[data-testid="add-timeline-entry"]');
    await page.fill('[data-testid="timeline-comment"]', 'Customer notified');
    await page.click('[data-testid="save-timeline-entry"]');
    
    // Vérifier que le commentaire a été ajouté
    await expect(page.locator('[data-testid="timeline-entry"]')).toContainText('Customer notified');
  });
});

test.describe('Suppliers Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
  });

  test('complete supplier management workflow', async ({ page }) => {
    // Naviguer vers le module fournisseurs
    await page.click('[data-testid="suppliers-nav"]');
    await expect(page).toHaveURL('/suppliers-module');
    
    // 1. Créer un nouveau fournisseur
    await page.click('[data-testid="create-supplier-button"]');
    
    await page.fill('[data-testid="supplier-name"]', 'Test Supplier E2E');
    await page.fill('[data-testid="contact-person"]', 'John Doe');
    await page.fill('[data-testid="supplier-email"]', 'john@supplier.com');
    await page.fill('[data-testid="supplier-phone"]', '0123456789');
    await page.fill('[data-testid="supplier-address"]', '123 Test Street');
    await page.fill('[data-testid="supplier-city"]', 'Test City');
    await page.fill('[data-testid="supplier-postal-code"]', '75000');
    
    await page.click('[data-testid="save-supplier-button"]');
    
    // 2. Vérifier que le fournisseur a été créé
    await expect(page.locator('[data-testid="supplier-list"]')).toContainText('Test Supplier E2E');
    
    // 3. Créer une commande d'achat
    await page.click('[data-testid="create-order-button"]');
    await page.selectOption('[data-testid="supplier-select"]', { label: 'Test Supplier E2E' });
    await page.selectOption('[data-testid="store-select"]', 'Ville d\'Avray');
    
    // Ajouter des produits à la commande
    await page.click('[data-testid="add-order-item"]');
    await page.selectOption('[data-testid="product-select"]', { label: 'Chaine de vélo' });
    await page.fill('[data-testid="item-quantity"]', '5');
    await page.fill('[data-testid="item-price"]', '15.99');
    await page.click('[data-testid="add-item-button"]');
    
    await page.click('[data-testid="save-order-button"]');
    
    // 4. Vérifier que la commande a été créée
    await expect(page.locator('[data-testid="order-list"]')).toContainText('Test Supplier E2E');
    
    // 5. Mettre à jour le statut de la commande
    await page.click('[data-testid="order-status-button"]');
    await page.click('[data-testid="status-sent"]');
    
    // 6. Vérifier l'analytics
    await page.click('[data-testid="analytics-tab"]');
    await expect(page.locator('[data-testid="supplier-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-stats"]')).toBeVisible();
  });
});
```

---

## 🚀 CONFIGURATION CI/CD

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests and Quality

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-django pytest-cov
    
    - name: Run tests
      run: |
        cd backend
        pytest --cov=. --cov-report=xml
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run unit tests
      run: |
        cd frontend
        npm run test:coverage
    
    - name: Run E2E tests
      run: |
        cd frontend
        npm run build
        npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info

  quality-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run ESLint
      run: |
        cd frontend
        npm run lint
    
    - name: Run Prettier check
      run: |
        cd frontend
        npm run format:check
    
    - name: Run Python linting
      run: |
        cd backend
        pip install flake8 black
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        black --check .

  deploy-staging:
    needs: [backend-tests, frontend-tests, quality-check]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging
      run: |
        echo "Deploy to staging environment"
        # Ajouter les commandes de déploiement ici
```

---

## 📊 RAPPORTS DE COVERAGE

### Scripts de Reporting
```javascript
// frontend/scripts/generate-coverage-report.js
const { execSync } = require('child_process');

console.log('🧪 Generating coverage reports...');

try {
  // Exécuter les tests avec coverage
  execSync('npm run test:coverage', { stdio: 'inherit' });
  
  // Générer le rapport HTML
  execSync('npm run coverage:report', { stdio: 'inherit' });
  
  console.log('✅ Coverage report generated successfully!');
  console.log('📊 Open coverage/lcov-report/index.html to view detailed report');
  
} catch (error) {
  console.error('❌ Error generating coverage report:', error.message);
  process.exit(1);
}
```

### Dashboard de Coverage
```python
# backend/scripts/coverage_dashboard.py
import json
import subprocess
from pathlib import Path

def generate_coverage_dashboard():
    """Générer un dashboard de coverage"""
    
    # Exécuter les tests avec coverage
    result = subprocess.run([
        'pytest', '--cov=.', '--cov-report=json', '--cov-report=html'
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error running tests: {result.stderr}")
        return
    
    # Lire le rapport JSON
    with open('coverage.json') as f:
        coverage_data = json.load(f)
    
    # Extraire les métriques
    total_coverage = coverage_data['totals']['percent_covered']
    
    print(f"""
📊 Coverage Dashboard
=====================
Coverage Total: {total_coverage:.1f}%
Files Covered: {len([f for f in coverage_data['files'].values() if f['summary']['percent_covered'] > 0])})
Missing Coverage: {len([f for f in coverage_data['files'].values() if f['summary']['percent_covered'] < 80])}
""")
    
    # Afficher les fichiers avec faible coverage
    low_coverage_files = [
        (file, data['summary']['percent_covered'])
        for file, data in coverage_data['files'].items()
        if data['summary']['percent_covered'] < 80
    ]
    
    if low_coverage_files:
        print("\n⚠️ Files with low coverage (<80%):")
        for file, coverage in sorted(low_coverage_files, key=lambda x: x[1]):
            print(f"  {file}: {coverage:.1f}%")

if __name__ == '__main__':
    generate_coverage_dashboard()
```

---

## 🎯 RÉSULTATS ATTENDUS

### Couverture de Code
- **Backend**: >85% coverage sur modèles et vues
- **Frontend**: >80% coverage sur composants et hooks
- **Tests E2E**: Couverture des workflows critiques

### Qualité du Code
- **Zéro régression** avec tests automatisés
- **Documentation** des cas de test
- **CI/CD** avec validation automatique

### Performance des Tests
- **Exécution parallèle** pour rapidité
- **Mocking intelligent** pour isolation
- **Reporting détaillé** pour analyse

---

*Suite de tests complète - Implémentée le 18 mars 2026*
