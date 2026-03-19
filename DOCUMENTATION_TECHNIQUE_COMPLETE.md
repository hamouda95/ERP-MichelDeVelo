# 📚 DOCUMENTATION TECHNIQUE - ERP MICHEL DE VÉLO

## 🏗️ ARCHITECTURE GLOBALE

### Stack Technique
- **Backend**: Django 4.x + Django REST Framework + PostgreSQL (Supabase)
- **Frontend**: React 18 + Tailwind CSS + Zustand (state management)
- **Authentification**: JWT + Google OAuth
- **Base de données**: PostgreSQL avec 47 tables structurées

---

## 🔧 MODULES COMPLEXES

### 1. Module Réparations (RepairsModule.jsx)

#### Architecture du Composant
```javascript
// Structure principale
RepairsModule
├── États principaux
│   ├── repairs: Array<Repair>
│   ├── activeView: 'list' | 'kanban' | 'timeline' | 'dashboard'
│   ├── filters: FilterState
│   └── modals: ModalState
├── Sous-composants
│   ├── RepairPartsManager
│   ├── QuickRepairForm
│   ├── LoadingSpinner
│   └── ErrorMessage
└── Workflow Kanban
    └── Colonnes: pending → in_progress → waiting_parts → ready → delivered
```

#### Modèle de Données Repair
```typescript
interface Repair {
  id: number;
  reference_number: string;           // Auto-généré: REP-VA-20260318-001
  client: ClientInfo;                // Informations client
  store: 'ville_avray' | 'garches';  // Magasin
  bike_details: {
    brand: string;
    model: string;
    serial_number?: string;
    type: 'mtb' | 'road' | 'electric' | 'city' | 'kids' | 'other';
  };
  repair_info: {
    description: string;              // Description du problème
    diagnosis?: string;               // Diagnostic technique
    type: 'repair' | 'maintenance' | 'customization' | 'emergency';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'pending' | 'diagnosis' | 'waiting_parts' | 'in_progress' | 
            'testing' | 'completed' | 'delivered' | 'cancelled';
  };
  financial: {
    estimated_cost: number;
    final_cost?: number;
    max_budget?: number;
    deposit_paid?: number;
    labor_hours: number;
    labor_rate: number;
  };
  timing: {
    estimated_completion?: string;
    estimated_duration?: string;
    created_at: string;
    updated_at: string;
  };
  assignment: {
    assigned_to?: string;            // ID du mécanicien
  };
  media: {
    photo_1?: File;
    photo_2?: File;
    photo_3?: File;
    documents?: Array<Document>;
  };
  parts_needed: Array<RepairPart>;
  notes?: string;
}
```

#### Workflow Kanban
```javascript
const WORKFLOW_COLUMNS = [
  { id: 'pending', title: 'En attente', color: 'bg-yellow-50' },
  { id: 'in_progress', title: 'En cours', color: 'bg-purple-50' },
  { id: 'waiting_parts', title: 'Attente pièces', color: 'bg-orange-50' },
  { id: 'ready', title: 'Prête', color: 'bg-green-50' },
  { id: 'delivered', title: 'Livrée', color: 'bg-emerald-50' }
];
```

#### Fonctionnalités Clés
- **Drag & Drop**: React Beautiful DND pour le workflow
- **Recherche Avancée**: Autocomplete clients, filtrage multi-critères
- **Gestion des Pièces**: Intégration stock en temps réel
- **Documents**: Upload photos, PDF, génération devis
- **Timeline**: Historique complet des actions

---

### 2. Module Fournisseurs (SuppliersModule.jsx)

#### Architecture du Composant
```javascript
SuppliersModule
├── Vues multiples
│   ├── suppliers: Gestion fournisseurs
│   ├── orders: Commandes d'achat
│   ├── transfers: Transferts inter-magasins
│   └── analytics: Performance fournisseurs
├── États partagés
│   ├── suppliers: Array<Supplier>
│   ├── purchaseOrders: Array<PurchaseOrder>
│   ├── transfers: Array<Transfer>
│   └── statistics: SupplierStats
└── Modals complexes
    ├── SupplierModal: CRUD fournisseur
    ├── OrderModal: Commande d'achat
    ├── TransferModal: Transfert magasin
    └── DocumentModal: Parsing factures
```

#### Modèle de Données Supplier
```typescript
interface Supplier {
  id: number;
  company_info: {
    name: string;
    company_name?: string;
    siret?: string;
    vat_number?: string;
    website?: string;
  };
  contact: {
    contact_person?: string;
    email?: string;
    phone?: string;
    phone_secondary?: string;
  };
  address: {
    address: string;
    city: string;
    postal_code: string;
    country: string;                  // Default: 'France'
  };
  business: {
    payment_terms?: string;
    delivery_delay: number;           // Default: 7 jours
    minimum_order: number;            // Minimum commande
    product_categories?: string;      // Categories séparées par ,
    notes?: string;
  };
  performance: {
    rating?: number;                  // 1-5 étoiles
    total_orders?: number;
    avg_delivery_time?: number;
    reliability_score?: number;
  };
  status: {
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
}
```

#### Workflow Commandes
```typescript
interface PurchaseOrder {
  id: number;
  supplier: Supplier;
  store: 'ville_avray' | 'garches';
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';
  items: Array<OrderItem>;
  financial: {
    total_amount: number;
    tax_amount: number;
    shipping_cost?: number;
    currency: string;                 // Default: 'EUR'
  };
  timing: {
    order_date: string;
    expected_delivery: string;
    actual_delivery?: string;
  };
  documents: {
    order_file?: File;
    invoice_file?: File;
    delivery_note?: File;
  };
}
```

---

### 3. API Unifiée (api_consolidated.js)

#### Architecture des Services
```javascript
// Structure hiérarchique
api_consolidated.js
├── Configuration Axios
│   ├── Base URL: process.env.REACT_APP_API_URL
│   ├── Timeout: 30s
│   └── Intercepteurs (request/response)
├── Services par module
│   ├── authAPI: Authentification & utilisateurs
│   ├── productsAPI: Produits & catégories
│   ├── clientsAPI: Gestion clients
│   ├── ordersAPI: Commandes clients
│   ├── repairsAPI: Réparations (toutes variantes)
│   ├── suppliersAPI: Fournisseurs & achats
│   ├── financeAPI: Finance & comptabilité
│   ├── analyticsAPI: Statistiques & KPIs
│   ├── appointmentsAPI: RDV & calendrier
│   ├── settingsAPI: Configuration système
│   ├── invoicesAPI: Facturation
│   ├── quotesAPI: Devis
│   └── utilsAPI: Utilitaires divers
└── Gestion des erreurs
    ├── 401: Redirection login
    ├── 403: Permission refusée
    ├── 404: Ressource introuvable
    └── 500: Erreur serveur
```

#### Gestion des Tokens
```javascript
// Support multiple storage methods
const getToken = () => {
  // 1. Auth storage (Zustand)
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      return JSON.parse(authStorage)?.state?.token;
    } catch (e) {
      console.warn('Invalid auth-storage format');
    }
  }
  
  // 2. Direct token
  return localStorage.getItem('token');
};
```

#### Intercepteurs d'Erreur
```javascript
// Response interceptor avec gestion 401 automatique
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Nettoyage complet auth
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('token');
      
      // Redirection vers login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Logging détaillé
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    return Promise.reject(error);
  }
);
```

---

## 🗄️ MODÈLES DE DONNÉES COMPLEXES

### Base de Données - 47 Tables

#### Architecture Multi-Magasins
```sql
-- Tables principales avec ségrégation magasin
products_product
├── stock_ville_avray: integer
├── stock_garches: integer
├── alert_stock: boolean
└── barcode: string

repairs_repair
├── store: 'ville_avray' | 'garches'
├── reference_number: string (auto-généré)
└── assigned_to: integer (mécanicien)

orders_order
├── store: 'ville_avray' | 'garches'
└── delivery_address: json
```

#### Workflow Réparations
```sql
-- Tables liées aux réparations
repairs_repair                 -- Réparations principales
repairs_repairitem            -- Pièces utilisées
repairs_repairtimeline        -- Historique des actions
repairs_repairdocument        -- Documents joints
workshop_workload             -- Charge de travail atelier
```

#### Intégration Wix
```sql
-- Tables pour synchronisation Wix
appointments_appointment      -- RDV locaux
appointments_wixsynclog       -- Logs de synchronisation
appointments_appointmentreminder -- Rappels automatiques
```

---

## 🔄 WORKFLOWS MÉTIER

### 1. Cycle de Vie Réparation
```
Création → Diagnostic → Attente Pièces → Réparation → Test → Livraison
    ↓         ↓           ↓            ↓        ↓       ↓
 pending → diagnosis → waiting_parts → in_progress → testing → completed
                                                                   ↓
                                                              delivered
```

### 2. Commande Fournisseur
```
Besoin → Devis → Commande → Réception → Paiement
   ↓       ↓        ↓         ↓         ↓
draft → sent → confirmed → received → paid
```

### 3. Vente Client
```
Devis → Commande → Préparation → Livraison → Facturation
  ↓        ↓          ↓          ↓          ↓
quote → order → processing → shipped → invoiced
```

---

## 📊 PERFORMANCES ET OPTIMISATION

### Indexation Stratégique
```sql
-- Index critiques pour performance
CREATE INDEX idx_repairs_reference ON repairs_repair(reference_number);
CREATE INDEX idx_repairs_status_store ON repairs_repair(status, store);
CREATE INDEX idx_repairs_created_at ON repairs_repair(created_at DESC);
CREATE INDEX idx_appointments_client_status ON appointments_appointment(client_id, status);
CREATE INDEX idx_products_store_stock ON products_product(store, stock_ville_avray);
```

### Cache et Optimisation
```javascript
// React Query pour cache intelligent
const { data: repairs, isLoading } = useQuery(
  ['repairs', filters],
  () => repairsAPI.getAll(filters),
  {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    cacheTime: 10 * 60 * 1000,     // 10 minutes
    refetchOnWindowFocus: false
  }
);
```

---

## 🛡️ SÉCURITÉ

### Permissions par Rôle
```javascript
const permissions = {
  admin: ['*'],                        // Tous les droits
  manager: ['read', 'write', 'delete'], // Sauf utilisateurs système
  vendor: ['read', 'write'],           // Pas de suppression
  viewer: ['read']                     // Lecture seule
};
```

### Validation des Données
```javascript
// Validation backend Django
class RepairSerializer(serializers.ModelSerializer):
    class Meta:
        model = Repair
        fields = '__all__'
        
    def validate_estimated_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Le coût ne peut être négatif")
        return value
```

---

## 📱 DÉPLOIEMENT ET ENVIRONNEMENT

### Variables d'Environnement
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=votre-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,votre-domaine.com

# Frontend (.env)
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=production
```

### Configuration Supabase
```javascript
// Connexion PostgreSQL sécurisée
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);
```

---

*Documentation générée le 18 mars 2026 - Version complète*
