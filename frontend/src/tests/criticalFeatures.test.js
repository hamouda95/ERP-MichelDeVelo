"""
Tests frontend pour l'ERP Michel De Vélo
Utilise React Testing Library pour les composants critiques
"""
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import '@testing-library/jest-dom';
import RepairsModule from '../modules/RepairsModule';
import RepairTicket from '../pages/RepairTicket';
import Products from '../pages/Products';
import { repairsAPI } from '../services/api_consolidated';

// Mock du store et de l'API
jest.mock('../store', () => ({
  useAuthStore: () => ({ isAuthenticated: true, user: { id: 1, username: 'testuser' } })
}));

jest.mock('../services/api_consolidated', () => ({
  repairsAPI: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    getKanban: jest.fn(),
    statistics: jest.fn()
  }
}));

describe('RepairsModule Component', () => {
  const mockRepairs = [
    {
      id: 1,
      reference_number: 'REP-VA-20240301-001',
      client: { first_name: 'Jean', last_name: 'Dupont' },
      bike_brand: 'Trek',
      bike_model: 'Marlin 7',
      description: 'Frein avant qui fait du bruit',
      status: 'pending',
      priority: 'normal',
      created_at: '2024-03-01T10:00:00Z',
      estimated_cost: 150.00
    },
    {
      id: 2,
      reference_number: 'REP-VA-20240301-002',
      client: { first_name: 'Marie', last_name: 'Curie' },
      bike_brand: 'Specialized',
      bike_model: 'Allez',
      description: 'Changement de chaîne',
      status: 'in_progress',
      priority: 'high',
      created_at: '2024-03-01T09:30:00Z',
      estimated_cost: 89.99
    }
  ];

  beforeEach(() => {
    repairsAPI.getAll.mockResolvedValue({ data: { results: mockRepairs } });
    repairsAPI.getKanban.mockResolvedValue({
      data: {
        columns: {
          pending: { repairs: mockRepairs.filter(r => r.status === 'pending') },
          in_progress: { repairs: mockRepairs.filter(r => r.status === 'in_progress') },
          completed: { repairs: [] },
          delivered: { repairs: [] }
        }
      }
    });
  });

  test('renders repairs list correctly', async () => {
    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Réparations')).toBeInTheDocument();
    });

    // Vérifier que les réparations sont affichées
    expect(screen.getByText('REP-VA-20240301-001')).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Trek')).toBeInTheDocument();
    expect(screen.getByText('Frein avant qui fait du bruit')).toBeInTheDocument();
  });

  test('displays kanban columns', async () => {
    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Réception vélo')).toBeInTheDocument();
      expect(screen.getByText('En réparation')).toBeInTheDocument();
      expect(screen.getByText('Réparé - SMS envoyé')).toBeInTheDocument();
      expect(screen.getByText('Vélo récupéré')).toBeInTheDocument();
    });
  });

  test('filters work correctly', async () => {
    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Rechercher une réparation...')).toBeInTheDocument();
    });

    // Tester le filtre par recherche
    const searchInput = screen.getByPlaceholderText('Rechercher une réparation...');
    fireEvent.change(searchInput, { target: { value: 'Trek' } });

    await waitFor(() => {
      expect(screen.getByText('REP-VA-20240301-001')).toBeInTheDocument();
      expect(screen.queryByText('REP-VA-20240301-002')).not.toBeInTheDocument();
    });
  });

  test('create repair modal opens and closes', async () => {
    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nouvelle réparation')).toBeInTheDocument();
    });

    // Ouvrir le modal
    const createButton = screen.getByText('Nouvelle réparation');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Créer une réparation')).toBeInTheDocument();
      expect(screen.getByLabelText('Marque du vélo')).toBeInTheDocument();
      expect(screen.getByLabelText('Description du problème')).toBeInTheDocument();
    });

    // Fermer le modal
    const cancelButton = screen.getByText('Annuler');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Créer une réparation')).not.toBeInTheDocument();
    });
  });

  test('status update works', async () => {
    repairsAPI.updateStatus.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Trouver une réparation et la mettre à jour
      const repairCard = screen.getByText('Frein avant qui fait du bruit').closest('[data-testid="repair-card"]');
      fireEvent.click(repairCard);
      
      // Mettre à jour le statut
      const statusButton = screen.getByText('En réparation');
      fireEvent.click(statusButton);
    });

    // Vérifier que l'API a été appelée
    expect(repairsAPI.updateStatus).toHaveBeenCalledWith(
      1, // ID de la réparation
      { status: 'in_progress' }
    );
  });
});

describe('RepairTicket Component', () => {
  const mockRepair = {
    id: 1,
    reference_number: 'REP-VA-20240301-001',
    client: {
      id: 1,
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '0123456789'
    },
    bike_brand: 'Trek',
    bike_model: 'Marlin 7',
    description: 'Frein avant qui fait du bruit',
    diagnosis: 'Usure des plaquettes de frein',
    status: 'pending',
    priority: 'normal',
    estimated_cost: 150.00,
    created_at: '2024-03-01T10:00:00Z'
  };

  beforeEach(() => {
    repairsAPI.getById.mockResolvedValue({ data: mockRepair });
  });

  test('renders repair ticket details', async () => {
    render(
      <BrowserRouter>
        <RepairTicket />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ticket REP-VA-20240301-001')).toBeInTheDocument();
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
      expect(screen.getByText('Trek')).toBeInTheDocument();
      expect(screen.getByText('Marlin 7')).toBeInTheDocument();
      expect(screen.getByText('Frein avant qui fait du bruit')).toBeInTheDocument();
      expect(screen.getByText('Usure des plaquettes de frein')).toBeInTheDocument();
    });
  });

  test('edit mode works', async () => {
    repairsAPI.update.mockResolvedValue({ data: { ...mockRepair, bike_brand: 'Giant' } });

    render(
      <BrowserRouter>
        <RepairTicket />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });

    // Activer le mode édition
    const editButton = screen.getByText('Modifier');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Giant')).toBeInTheDocument();
      expect(screen.getByText('Sauvegarder')).toBeInTheDocument();
    });
  });

  test('status change works', async () => {
    repairsAPI.updateStatus.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <RepairTicket />
      </BrowserRouter>
    );

    await waitFor(() => {
      const statusButton = screen.getByText('Changer le statut');
      fireEvent.click(statusButton);
    });

    await waitFor(() => {
      expect(screen.getByText('En réparation')).toBeInTheDocument();
      fireEvent.click(screen.getByText('En réparation'));
    });

    // Vérifier que l'API a été appelée
    expect(repairsAPI.updateStatus).toHaveBeenCalledWith(
      1,
      { status: 'in_progress' }
    );
  });

  test('print button works', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    const mockUrl = 'blob:test-url';
    
    global.URL.createObjectURL = jest.fn(() => mockUrl);
    global.URL.revokeObjectURL = jest.fn();

    repairsAPI.printQuote.mockResolvedValue({ data: mockBlob });

    render(
      <BrowserRouter>
        <RepairTicket />
      </BrowserRouter>
    );

    await waitFor(() => {
      const printButton = screen.getByText('Imprimer');
      fireEvent.click(printButton);
    });

    // Vérifier que l'API a été appelée
    expect(repairsAPI.printQuote).toHaveBeenCalledWith(1);
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
  });
});

describe('Products Component', () => {
  const mockProducts = [
    {
      id: 1,
      name: 'Chambre à air',
      reference: 'CA-001',
      category: { name: 'Pièces détachées' },
      price: 25.99,
      total_stock: 50,
      min_stock: 10
    },
    {
      id: 2,
      name: 'Pédalier Shimano',
      reference: 'PD-001',
      category: { name: 'Transmission' },
      price: 89.99,
      total_stock: 25,
      min_stock: 5
    }
  ];

  beforeEach(() => {
    // Mock de l'API produits
    const mockProductsAPI = {
      getAll: jest.fn().mockResolvedValue({ data: { results: mockProducts } }),
      create: jest.fn().mockResolvedValue({ data: mockProducts[0] })
    };
    jest.doMock('../services/api_consolidated', () => ({
      productsAPI: mockProductsAPI
    }));
  });

  test('renders products list', async () => {
    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chambre à air')).toBeInTheDocument();
      expect(screen.getByText('Pédalier Shimano')).toBeInTheDocument();
      expect(screen.getByText('25,99€')).toBeInTheDocument();
      expect(screen.getByText('89,99€')).toBeInTheDocument();
    });
  });

  test('search functionality works', async () => {
    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Rechercher un produit...')).toBeInTheDocument();
    });

    // Tester la recherche
    const searchInput = screen.getByPlaceholderText('Rechercher un produit...');
    fireEvent.change(searchInput, { target: { value: 'Chambre' } });

    await waitFor(() => {
      expect(screen.getByText('Chambre à air')).toBeInTheDocument();
      expect(screen.queryByText('Pédalier Shimano')).not.toBeInTheDocument();
    });
  });

  test('low stock warning displays', async () => {
    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Vérifier l'affichage des alertes de stock faible
      const stockWarnings = screen.getAllByText(/Stock faible/);
      expect(stockWarnings.length).toBeGreaterThan(0);
    });
  });
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('repairsAPI.getAll handles success', async () => {
    const mockRepairs = [{ id: 1, reference_number: 'TEST-001' }];
    repairsAPI.getAll.mockResolvedValue({ data: { results: mockRepairs } });

    const result = await repairsAPI.getAll();
    
    expect(repairsAPI.getAll).toHaveBeenCalled();
    expect(result.data.results).toEqual(mockRepairs);
  });

  test('repairsAPI.getAll handles error', async () => {
    const mockError = new Error('API Error');
    repairsAPI.getAll.mockRejectedValue(mockError);

    try {
      await repairsAPI.getAll();
    } catch (error) {
      expect(error).toEqual(mockError);
    }
  });

  test('repairsAPI.create works', async () => {
    const newRepair = {
      bike_brand: 'Test',
      description: 'Test repair'
    };
    const createdRepair = { id: 1, ...newRepair };
    repairsAPI.create.mockResolvedValue({ data: createdRepair });

    const result = await repairsAPI.create(newRepair);
    
    expect(repairsAPI.create).toHaveBeenCalledWith(newRepair);
    expect(result.data).toEqual(createdRepair);
  });

  test('error handling in API calls', async () => {
    const mockError = {
      response: {
        status: 400,
        data: { error: 'Validation failed' }
      }
    };
    repairsAPI.create.mockRejectedValue(mockError);

    try {
      await repairsAPI.create({});
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('Validation failed');
    }
  });
});

describe('Security Tests', () => {
  test('XSS prevention in form inputs', async () => {
    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      const createButton = screen.getByText('Nouvelle réparation');
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      const descriptionInput = screen.getByLabelText('Description du problème');
      
      // Tenter d'injecter du code malveillant
      fireEvent.change(descriptionInput, { 
        target: { value: '<script>alert("xss")</script>' } 
      });
      
      // Vérifier que le script n'est pas exécuté
      expect(global.alert).not.toHaveBeenCalled();
    });
  });

  test('authentication is required', async () => {
    // Mock utilisateur non authentifié
    jest.doMock('../store', () => ({
      useAuthStore: () => ({ isAuthenticated: false })
    }));

    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    // Devrait rediriger vers login
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });
});

describe('Performance Tests', () => {
  test('large dataset renders efficiently', async () => {
    const largeRepairsList = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      reference_number: `REP-${i + 1}`,
      client: { first_name: `Client${i + 1}`, last_name: 'Test' },
      bike_brand: 'Bike',
      description: `Description ${i + 1}`,
      status: 'pending'
    }));

    repairsAPI.getAll.mockResolvedValue({ data: { results: largeRepairsList } });

    const startTime = performance.now();
    
    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Réparations')).toBeInTheDocument();
    });

    const renderTime = performance.now() - startTime;
    
    // Le rendu devrait prendre moins de 2 secondes même avec 1000 éléments
    expect(renderTime).toBeLessThan(2000);
  });

  test('api calls are debounced', async () => {
    render(
      <BrowserRouter>
        <RepairsModule />
      </BrowserRouter>
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Rechercher une réparation...');
      
      // Faire plusieurs changements rapidement
      fireEvent.change(searchInput, { target: { value: 'test1' } });
      fireEvent.change(searchInput, { target: { value: 'test2' } });
      fireEvent.change(searchInput, { target: { value: 'test3' } });
    });

    // L'API ne devrait être appelée qu'une fois après le debounce
    await waitFor(() => {
      expect(repairsAPI.getAll).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });
  });
});
