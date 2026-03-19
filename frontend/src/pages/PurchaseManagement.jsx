import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  StarIcon,
  PaperAirplaneIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  LightBulbIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { suppliersAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // États pour les modales
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStockConfigModal, setShowStockConfigModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // États pour les transferts
  const [transfers, setTransfers] = useState([]);
  const [stockConfigs, setStockConfigs] = useState([]);
  const [transferSuggestions, setTransferSuggestions] = useState([]);

  // Formulaires
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    siret: '',
    payment_terms: '',
    delivery_delay: 7,
    minimum_order: 0,
    product_categories: '',
    notes: '',
    is_active: true,
    is_preferred: false,
  });

  const [orderForm, setOrderForm] = useState({
    supplier: '',
    store: 'central', // Ajout du stock central
    expected_delivery_date: '',
    notes: '',
    shipping_cost: 0,
    items: [],
  });

  const [receptionForm, setReceptionForm] = useState({
    order_id: '',
    items: [],
    notes: '',
    document_type: 'delivery_note',
  });

  const [transferForm, setTransferForm] = useState({
    from_store: 'central',
    to_store: 'ville_avray',
    items: [],
    notes: '',
  });

  const [stockConfigForm, setStockConfigForm] = useState({
    product_id: '',
    store: 'ville_avray',
    min_stock: 5,
    max_stock: 20,
    priority: 1,
    seasonal_factor: 1.0,
  });

  // Données pour le tableau de bord
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalAmount: 0,
    lowStockProducts: 0,
    activeSuppliers: 0,
    pendingTransfers: 0,
    suggestedTransfers: 0,
    centralStock: 0,
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setError(null);
      const [suppliersRes, ordersRes, productsRes, statsRes] = await Promise.all([
        suppliersAPI.getAll(),
        suppliersAPI.getPurchaseOrders(),
        productsAPI.getAll(),
        suppliersAPI.getPurchaseStatistics(),
      ]);
      
      setSuppliers(Array.isArray(suppliersRes.data.results || suppliersRes.data) ? suppliersRes.data.results || suppliersRes.data : []);
      setOrders(Array.isArray(ordersRes.data.results || ordersRes.data) ? ordersRes.data.results || ordersRes.data : []);
      setProducts(Array.isArray(productsRes.data.results || productsRes.data) ? productsRes.data.results || productsRes.data : []);
      
      // Calculer les statistiques étendues
      const productsData = Array.isArray(productsRes.data.results || productsRes.data) ? productsRes.data.results || productsRes.data : [];
      const lowStock = productsData.filter(p => p.is_active && (p.stock_ville_avray <= p.alert_stock || p.stock_garches <= p.alert_stock)).length;
      
      // Calculer le stock central (commandes reçues non transférées)
      const centralOrders = orders.filter(o => o.store === 'central' && o.status === 'received');
      const centralStockValue = centralOrders.reduce((sum, order) => sum + (parseFloat(order.total_ttc) || 0), 0);
      
      setStats({
        totalOrders: statsRes.data.total_orders || 0,
        pendingOrders: statsRes.data.pending_orders || 0,
        totalAmount: statsRes.data.total_amount || 0,
        lowStockProducts: lowStock,
        activeSuppliers: suppliers.filter(s => s.is_active).length,
        pendingTransfers: transfers.filter(t => t.status === 'pending').length,
        suggestedTransfers: transferSuggestions.length,
        centralStock: centralStockValue,
      });
    } catch (error) {
      console.error('Erreur chargement:', error);
      setError('Impossible de charger les données');
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour les transferts
  const generateTransferSuggestions = () => {
    const suggestions = [];
    const priorityOrder = ['ville_avray', 'garches']; // Ville d'Avray prioritaire
    
    for (const store of priorityOrder) {
      const storeNeeds = calculateStoreNeeds(store);
      
      for (const need of storeNeeds) {
        const available = getCentralStock(need.product);
        
        if (available > 0) {
          suggestions.push({
            product: need.product,
            to_store: store,
            quantity: Math.min(need.needed_quantity, available),
            priority: need.priority,
            reason: `Stock actuel: ${need.current_stock}, Minimum: ${need.min_stock}`,
            current_stock: need.current_stock,
            min_stock: need.min_stock,
          });
        }
      }
    }
    
    setTransferSuggestions(suggestions);
    toast.success(`${suggestions.length} suggestions de transfert générées`);
  };

  const calculateStoreNeeds = (store) => {
    const needs = [];
    const productsData = products.filter(p => p.is_active);
    
    for (const product of productsData) {
      const currentStock = store === 'ville_avray' ? product.stock_ville_avray : product.stock_garches;
      const minStock = product.alert_stock;
      
      if (currentStock < minStock) {
        const needed = minStock - currentStock;
        needs.push({
          product: product,
          needed_quantity: needed,
          current_stock: currentStock,
          min_stock: minStock,
          priority: 1, // Par défaut, peut être configuré
        });
      }
    }
    
    return needs;
  };

  const getCentralStock = (product) => {
    // Simuler le stock central (sera calculé depuis le backend)
    const centralOrders = orders.filter(o => o.store === 'central' && o.status === 'received');
    const centralItems = centralOrders.flatMap(o => o.items || []);
    const productItems = centralItems.filter(item => item.product_name === product.name);
    return productItems.reduce((sum, item) => sum + (item.quantity_received || item.quantity || 0), 0);
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      // Simulation - sera implémenté dans le backend
      const newTransfer = {
        id: Date.now(),
        ...transferForm,
        status: 'pending',
        created_at: new Date().toISOString(),
        items: transferForm.items.map(item => ({
          ...item,
          quantity_suggested: item.quantity,
          quantity_validated: item.quantity,
          quantity_received: 0,
        })),
      };
      
      setTransfers([...transfers, newTransfer]);
      toast.success('Transfert créé');
      setShowTransferModal(false);
      resetTransferForm();
      loadAllData();
    } catch (error) {
      toast.error('Erreur lors de la création du transfert');
    }
  };

  const handleValidateTransfer = async (transferId, validatedItems) => {
    try {
      setTransfers(transfers.map(t => 
        t.id === transferId 
          ? { ...t, status: 'validated', validated_at: new Date().toISOString(), items: validatedItems }
          : t
      ));
      toast.success('Transfert validé');
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  const resetTransferForm = () => {
    setTransferForm({
      from_store: 'central',
      to_store: 'ville_avray',
      items: [],
      notes: '',
    });
    setSelectedItem(null);
  };

  // Fonctions pour les fournisseurs
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await suppliersAPI.create(supplierForm);
      toast.success('Fournisseur créé');
      setShowSupplierModal(false);
      resetSupplierForm();
      loadAllData();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    try {
      await suppliersAPI.update(selectedItem.id, supplierForm);
      toast.success('Fournisseur mis à jour');
      setShowSupplierModal(false);
      resetSupplierForm();
      loadAllData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    if (window.confirm(`Supprimer ${supplier.name} ?`)) {
      try {
        await suppliersAPI.delete(supplier.id);
        toast.success('Fournisseur supprimé');
        loadAllData();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      siret: '',
      payment_terms: '',
      delivery_delay: 7,
      minimum_order: 0,
      product_categories: '',
      notes: '',
      is_active: true,
      is_preferred: false,
    });
    setSelectedItem(null);
  };

  // Fonctions pour les commandes
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      if (orderForm.items.length === 0) {
        toast.error('Ajoutez au moins un article');
        return;
      }

      const orderData = {
        ...orderForm,
        expected_delivery_date: orderForm.expected_delivery_date || new Date().toISOString().split('T')[0],
        items: orderForm.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      await suppliersAPI.createPurchaseOrder(orderData);
      toast.success('Commande créée');
      setShowOrderModal(false);
      resetOrderForm();
      loadAllData();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleSendOrder = async (orderId) => {
    try {
      await suppliersAPI.sendToSupplier(orderId);
      toast.success('Commande envoyée');
      loadAllData();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      await suppliersAPI.confirmOrder(orderId);
      toast.success('Commande confirmée');
      loadAllData();
    } catch (error) {
      toast.error('Erreur lors de la confirmation');
    }
  };

  const resetOrderForm = () => {
    setOrderForm({
      supplier: '',
      store: 'ville_avray',
      expected_delivery_date: '',
      notes: '',
      shipping_cost: 0,
      items: [],
    });
    setSelectedItem(null);
  };

  // Fonctions pour les réceptions
  const handleReception = async (e) => {
    e.preventDefault();
    try {
      const itemsData = receptionForm.items.map(item => ({
        item_id: item.id,
        received_quantity: item.received_quantity,
      }));

      await suppliersAPI.receiveItems(receptionForm.order_id, itemsData);
      toast.success('Commande réceptionnée');
      setShowReceptionModal(false);
      resetReceptionForm();
      loadAllData();
    } catch (error) {
      toast.error('Erreur lors de la réception');
    }
  };

  const resetReceptionForm = () => {
    setReceptionForm({
      order_id: '',
      items: [],
      notes: '',
      document_type: 'delivery_note',
    });
    setSelectedItem(null);
  };

  const orderStatusConfig = {
    draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
    sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800', icon: TruckIcon },
    confirmed: { label: 'Confirmé', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircleIcon },
    partial: { label: 'Partiellement reçu', color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
    received: { label: 'Reçu', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
  };

  const filteredOrders = (orders || []).filter(order => {
    const matchesSearch = order.purchase_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesStore = filterStore === 'all' || order.store === filterStore;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  const filteredSuppliers = (suppliers || []).filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isLowStock = product.stock_ville_avray <= product.alert_stock || product.stock_garches <= product.alert_stock;
    const matchesStock = activeTab === 'stock' ? isLowStock : true;
    
    return matchesSearch && matchesStock && product.is_active;
  });

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement de la gestion des achats..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAllData} />;
  }

  return (
    <div className="p-6">
      {/* En-tête avec actions unifiées */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Achats Multi-Magasins</h1>
          <p className="text-gray-600 mt-1">Module unifié pour tout le cycle d'achat et transferts de vos magasins vélo</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              resetSupplierForm();
              setShowSupplierModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <BuildingOfficeIcon className="w-5 h-5" />
            Nouveau Fournisseur
          </button>
          <button
            onClick={() => {
              resetOrderForm();
              setShowOrderModal(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Commande Centrale
          </button>
          <button
            onClick={() => {
              resetTransferForm();
              setShowTransferModal(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <TruckIcon className="w-5 h-5" />
            Nouveau Transfert
          </button>
          <button
            onClick={generateTransferSuggestions}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center gap-2"
          >
            <LightBulbIcon className="w-5 h-5" />
            Suggestions
          </button>
        </div>
      </div>

      {/* Tableau de bord */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filtres globaux */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher (commandes, fournisseurs, produits)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les magasins</option>
                <option value="ville_avray">Ville d'Avray</option>
                <option value="garches">Garches</option>
              </select>
            </div>
          </div>

          {/* Cartes statistiques étendues */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <TruckIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Commandes totales</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Montant total</p>
                  <p className="text-2xl font-bold text-gray-900">{parseFloat(stats.totalAmount || 0).toLocaleString('fr-FR')} €</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <ArrowRightIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Transferts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingTransfers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-indigo-100 rounded-full">
                  <ArchiveBoxIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stock central</p>
                  <p className="text-2xl font-bold text-gray-900">{parseFloat(stats.centralStock || 0).toLocaleString('fr-FR')} €</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tableaux récents */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Commandes récentes */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Commandes récentes</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {filteredOrders.slice(0, 3).map((order) => {
                    const StatusIcon = orderStatusConfig[order.status]?.icon || ClockIcon;
                    return (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <StatusIcon className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">{order.purchase_order_number}</p>
                            <p className="text-sm text-gray-500">{order.supplier?.name} ({order.store})</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            orderStatusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'
                          }`}>
                            {orderStatusConfig[order.status]?.label || order.status}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {parseFloat(order.total_ttc || 0).toLocaleString('fr-FR')} €
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Aucune commande trouvée</p>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="mt-4 w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                >
                  Voir toutes les commandes
                </button>
              </div>
            </div>

            {/* Transferts en attente */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Transferts en attente</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {transfers.filter(t => t.status === 'pending').slice(0, 3).map((transfer) => (
                    <div key={transfer.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center">
                        <TruckIcon className="w-5 h-5 text-yellow-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">
                            Central → {transfer.to_store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}
                          </p>
                          <p className="text-sm text-gray-500">{transfer.items?.length || 0} articles</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          En attente
                        </span>
                        <button
                          onClick={() => handleValidateTransfer(transfer.id, transfer.items)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-900"
                        >
                          Valider
                        </button>
                      </div>
                    </div>
                  ))}
                  {transfers.filter(t => t.status === 'pending').length === 0 && (
                    <p className="text-gray-500 text-center py-4">Aucun transfert en attente</p>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('transfers')}
                  className="mt-4 w-full px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
                >
                  Voir tous les transferts
                </button>
              </div>
            </div>

            {/* Produits en stock faible */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Stocks à surveiller</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {filteredProducts.filter(p => p.stock_ville_avray <= p.alert_stock || p.stock_garches <= p.alert_stock).slice(0, 3).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">Réf: {product.reference}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">
                          VA: {product.stock_ville_avray} | GA: {product.stock_garches}
                        </p>
                        <p className="text-xs text-gray-500">Alerte: {product.alert_stock}</p>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.filter(p => p.stock_ville_avray <= p.alert_stock || p.stock_garches <= p.alert_stock).length === 0 && (
                    <p className="text-gray-500 text-center py-4">Tous les stocks sont bons</p>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('stock')}
                  className="mt-4 w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  Voir tous les stocks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Commandes */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Commandes d'Achat</h3>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(orderStatusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <button
                onClick={() => window.location.href = '/orders'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Gérer les commandes
              </button>
            </div>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date livraison</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const StatusIcon = orderStatusConfig[order.status]?.icon || ClockIcon;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.purchase_order_number}</div>
                        <div className="text-sm text-gray-500">{order.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.supplier?.name}</div>
                        <div className="text-sm text-gray-500">{order.items?.length || 0} articles</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(order.total_ttc || 0).toLocaleString('fr-FR')} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full flex items-center gap-1 w-fit ${
                          orderStatusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          <StatusIcon className="w-3 h-3" />
                          {orderStatusConfig[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => window.location.href = `/orders?id=${order.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucune commande trouvée
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Fournisseurs */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Fournisseurs</h3>
            <button
              onClick={() => window.location.href = '/suppliers'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Gérer les fournisseurs
            </button>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                          <div className="text-sm text-gray-500">{supplier.company_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.contact_person || '-'}</div>
                      <div className="text-sm text-gray-500">{supplier.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.total_orders} commandes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(supplier.total_amount || 0).toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        supplier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSuppliers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun fournisseur trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Transferts */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Gestion des Transferts</h3>
            <div className="flex gap-2">
              <button
                onClick={generateTransferSuggestions}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center gap-2"
              >
                <LightBulbIcon className="w-4 h-4" />
                Générer Suggestions
              </button>
              <button
                onClick={() => {
                  resetTransferForm();
                  setShowTransferModal(true);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Nouveau Transfert
              </button>
            </div>
          </div>
          
          {/* Suggestions de transferts */}
          {transferSuggestions.length > 0 && (
            <div className="p-6 bg-yellow-50 border-b">
              <h4 className="font-semibold text-yellow-900 mb-4">Suggestions de Transfert</h4>
              <div className="space-y-3">
                {transferSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                    <div className="flex items-center">
                      <LightBulbIcon className="w-5 h-5 text-yellow-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{suggestion.product.name}</p>
                        <p className="text-sm text-gray-500">{suggestion.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-900">
                        {suggestion.quantity} unités
                      </span>
                      <span className="text-xs text-gray-500">
                        → {suggestion.to_store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}
                      </span>
                      <button
                        onClick={() => {
                          setTransferForm({
                            ...transferForm,
                            to_store: suggestion.to_store,
                            items: [{
                              product: suggestion.product,
                              quantity: suggestion.quantity,
                              reason: suggestion.reason,
                            }],
                          });
                          setShowTransferModal(true);
                        }}
                        className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfert</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origine → Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Articles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">TRF-{transfer.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transfer.from_store === 'central' ? 'Central' : transfer.from_store} → {' '}
                        {transfer.to_store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transfer.items?.length || 0} articles
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        transfer.status === 'validated' ? 'bg-blue-100 text-blue-800' :
                        transfer.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {transfer.status === 'pending' ? 'En attente' :
                         transfer.status === 'validated' ? 'Validé' :
                         transfer.status === 'in_transit' ? 'En transit' : 'Reçu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {transfer.status === 'pending' && (
                        <button
                          onClick={() => handleValidateTransfer(transfer.id, transfer.items)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Valider
                        </button>
                      )}
                      <button
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transfers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun transfert trouvé
              </div>
            )}
          </div>
        </div>
      )}
        {/* Onglet Stocks */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Surveillance des Stocks</h3>
            <button
              onClick={() => window.location.href = '/products'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Gérer les produits
            </button>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock VA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock GA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alerte</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isLowStockVA = product.stock_ville_avray <= product.alert_stock;
                  const isLowStockGA = product.stock_garches <= product.alert_stock;
                  const isLowStock = isLowStockVA || isLowStockGA;
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.category?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          isLowStockVA ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {product.stock_ville_avray}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          isLowStockGA ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {product.stock_garches}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.alert_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isLowStock
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isLowStock ? 'Stock faible' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun produit trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation par onglets */}
      <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-2 flex space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`p-3 rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Vue d'ensemble"
        >
          <ChartBarIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`p-3 rounded-lg transition ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Commandes"
        >
          <TruckIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`p-3 rounded-lg transition ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Fournisseurs"
        >
          <BuildingOfficeIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`p-3 rounded-lg transition ${
            activeTab === 'transfers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Transferts"
        >
          <ArrowRightIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`p-3 rounded-lg transition ${
            activeTab === 'stock'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Stocks"
        >
          <ArchiveBoxIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Modales */}
      {/* Modal de transfert */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {selectedItem ? 'Modifier le Transfert' : 'Nouveau Transfert'}
            </h3>
            
            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Origine</label>
                  <select
                    value={transferForm.from_store}
                    onChange={(e) => setTransferForm({...transferForm, from_store: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="central">Stock Central</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <select
                    value={transferForm.to_store}
                    onChange={(e) => setTransferForm({...transferForm, to_store: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="ville_avray">Ville d'Avray</option>
                    <option value="garches">Garches</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Articles</label>
                <div className="border border-gray-300 rounded-md p-4">
                  <div className="text-sm text-gray-500 mb-2">
                    Ajoutez les articles à transférer (interface à développer)
                  </div>
                  <div className="text-xs text-gray-400">
                    Cette section sera connectée au backend pour la sélection des produits
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({...transferForm, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                  placeholder="Notes sur le transfert..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Créer le Transfert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
