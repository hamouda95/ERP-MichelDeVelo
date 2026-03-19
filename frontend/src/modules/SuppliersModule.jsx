/**
 * ============================================================================ 
 * SUPPLIERS MODULE - UNIFIED SUPPLIER MANAGEMENT SYSTEM
 * ============================================================================ 
 * 
 * Consolidated supplier management combining:
 * - Basic supplier management (from Suppliers.jsx)
 * - Enhanced supplier features (from SuppliersManagement.jsx)
 * - Purchase order integration
 * - Transfer management
 * - Performance analytics
 * - Document parsing
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  // Icons
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  StarIcon,
  EyeIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  EnvelopeIcon,
  PhoneIcon,
  FunnelIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { suppliersAPI } from '../services/api_consolidated';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const SuppliersModule = () => {
  // View state
  const [activeView, setActiveView] = useState('suppliers'); // 'suppliers', 'orders', 'transfers', 'analytics'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data state
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  
  // Modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  // Selected items
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  
  // Form state
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    phone_secondary: '',
    website: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    siret: '',
    vat_number: '',
    payment_terms: '',
    delivery_delay: 7,
    minimum_order: 0,
    product_categories: '',
    notes: '',
    is_active: true,
    is_preferred: false,
  });

  const [orderFormData, setOrderFormData] = useState({
    supplier: '',
    store: 'ville_avray',
    expected_delivery_date: '',
    status: 'draft',
    items: [],
    notes: '',
    shipping_cost: 0,
  });

  // Status configurations
  const supplierStatusConfig = {
    active: { label: 'Actif', color: 'bg-green-100 text-green-800' },
    inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-800' }
  };

  const orderStatusConfig = {
    draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
    sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
    confirmed: { label: 'Confirmé', color: 'bg-indigo-100 text-indigo-800' },
    partial: { label: 'Partiellement reçu', color: 'bg-yellow-100 text-yellow-800' },
    received: { label: 'Reçu', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' }
  };

  const transferStatusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    in_transit: { label: 'En transit', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' }
  };

  // Load data based on active view
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      switch (activeView) {
        case 'suppliers':
          const suppliersResult = await suppliersAPI.getAll({
            search: searchTerm || undefined,
            is_active: filterStatus !== 'all' ? filterStatus === 'active' : undefined
          });
          setSuppliers(suppliersResult.data.results || suppliersResult.data);
          break;
          
        case 'orders':
          const ordersResult = await suppliersAPI.getPurchaseOrders({
            search: searchTerm || undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined,
            store: filterStore !== 'all' ? filterStore : undefined,
            supplier: filterSupplier !== 'all' ? filterSupplier : undefined
          });
          setPurchaseOrders(ordersResult.data.results || ordersResult.data);
          break;
          
        case 'transfers':
          const transfersResult = await suppliersAPI.getTransfers({
            search: searchTerm || undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined
          });
          setTransfers(transfersResult.data.results || transfersResult.data);
          break;
          
        case 'analytics':
          const [statsResult, purchaseStats, transferStats] = await Promise.all([
            suppliersAPI.getPurchaseStatistics(),
            suppliersAPI.getTransferStatistics(),
            suppliersAPI.getCriticalStocks()
          ]);
          setStatistics({
            purchases: purchaseStats.data,
            transfers: transferStats.data,
            criticalStocks: statsResult.data
          });
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Erreur lors du chargement des données');
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [activeView, searchTerm, filterStatus, filterStore, filterSupplier]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle supplier creation/update
  const handleSaveSupplier = async (data) => {
    try {
      if (selectedSupplier) {
        await suppliersAPI.update(selectedSupplier.id, data);
        toast.success('Fournisseur mis à jour avec succès');
      } else {
        await suppliersAPI.create(data);
        toast.success('Fournisseur créé avec succès');
      }
      setShowSupplierModal(false);
      setSelectedSupplier(null);
      loadData();
    } catch (err) {
      console.error('Error saving supplier:', err);
      toast.error('Erreur lors de la sauvegarde du fournisseur');
    }
  };

  // Handle supplier deletion
  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      return;
    }
    
    try {
      await suppliersAPI.delete(id);
      toast.success('Fournisseur supprimé avec succès');
      loadData();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      toast.error('Erreur lors de la suppression du fournisseur');
    }
  };

  // Handle purchase order creation
  const handleCreateOrder = async (data) => {
    try {
      await suppliersAPI.createPurchaseOrder(data);
      toast.success('Commande créée avec succès');
      setShowOrderModal(false);
      loadData();
    } catch (err) {
      console.error('Error creating order:', err);
      toast.error('Erreur lors de la création de la commande');
    }
  };

  // Handle document parsing
  const handleDocumentUpload = async (file, documentType) => {
    try {
      const result = await suppliersAPI.parseDocument(file, documentType);
      toast.success('Document analysé avec succès');
      return result.data;
    } catch (err) {
      console.error('Error parsing document:', err);
      toast.error('Erreur lors de l\'analyse du document');
      throw err;
    }
  };

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchTerm || 
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && supplier.is_active) ||
        (filterStatus === 'inactive' && !supplier.is_active);
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, filterStatus]);

  // Render suppliers view
  const renderSuppliersView = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={loadData} />;
    
    return (
      <div className="space-y-6">
        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                    {supplier.company_name && (
                      <p className="text-sm text-gray-500">{supplier.company_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {supplier.is_preferred && (
                    <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {supplier.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {supplier.contact_person && (
                  <div className="flex items-center text-sm text-gray-600">
                    <UserIcon className="w-4 h-4 mr-2" />
                    {supplier.contact_person}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <EnvelopeIcon className="w-4 h-4 mr-2" />
                    {supplier.email}
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon className="w-4 h-4 mr-2" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.city && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    {supplier.city}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  <p>{supplier.total_orders} commandes</p>
                  <p>{utilsAPI.formatPrice(supplier.total_amount)}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setShowDetailModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setSupplierFormData(supplier);
                      setShowSupplierModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(supplier.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render orders view
  const renderOrdersView = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={loadData} />;
    
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Numéro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fournisseur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Magasin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date livraison
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.purchase_order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.supplier?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.store}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      orderStatusConfig[order.status]?.color
                    }`}>
                      {orderStatusConfig[order.status]?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.expected_delivery_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {utilsAPI.formatPrice(order.total_ttc)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {order.status === 'draft' && (
                        <button
                          onClick={() => suppliersAPI.sendToSupplier(order.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            // Show receive items modal
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render analytics view
  const renderAnalyticsView = () => {
    if (loading) return <LoadingSpinner />;
    if (!statistics) return <ErrorMessage message="Statistiques non disponibles" />;
    
    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total fournisseurs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.purchases?.total_suppliers || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <TruckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Commandes en cours</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.purchases?.pending_orders || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Stocks critiques</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.criticalStocks?.length || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total achats</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {utilsAPI.formatPrice(statistics.purchases?.total_amount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Critical Stocks */}
        {statistics.criticalStocks?.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Stocks critiques</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Magasin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Stock actuel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Stock minimum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statistics.criticalStocks.map((stock, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stock.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.store}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {stock.current_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.min_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            // Create transfer suggestion
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Transférer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Import utilsAPI for formatting
  const utilsAPI = {
    formatPrice: (amount) => {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(amount || 0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Gestion des Fournisseurs</h1>
            </div>
            <div className="flex items-center space-x-4">
              {activeView === 'suppliers' && (
                <button
                  onClick={() => {
                    setSelectedSupplier(null);
                    setSupplierFormData({
                      name: '',
                      company_name: '',
                      contact_person: '',
                      email: '',
                      phone: '',
                      phone_secondary: '',
                      website: '',
                      address: '',
                      city: '',
                      postal_code: '',
                      country: 'France',
                      siret: '',
                      vat_number: '',
                      payment_terms: '',
                      delivery_delay: 7,
                      minimum_order: 0,
                      product_categories: '',
                      notes: '',
                      is_active: true,
                      is_preferred: false,
                    });
                    setShowSupplierModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Nouveau Fournisseur
                </button>
              )}
              {activeView === 'orders' && (
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Nouvelle Commande
                </button>
              )}
              <button
                onClick={() => setShowDocumentModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                Importer Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'suppliers', label: 'Fournisseurs', icon: BuildingOfficeIcon },
                { id: 'orders', label: 'Commandes', icon: TruckIcon },
                { id: 'transfers', label: 'Transferts', icon: ArchiveBoxIcon },
                { id: 'analytics', label: 'Analytiques', icon: ChartBarIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm ${
                    activeView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                />
              </div>
            </div>
            
            {activeView === 'suppliers' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            )}
            
            {(activeView === 'orders' || activeView === 'transfers') && (
              <>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  {activeView === 'orders' 
                    ? Object.entries(orderStatusConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))
                    : Object.entries(transferStatusConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))
                  }
                </select>
                
                <select
                  value={filterStore}
                  onChange={(e) => setFilterStore(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous les magasins</option>
                  <option value="central">Stock Central</option>
                  <option value="ville_avray">Ville d'Avray</option>
                  <option value="garches">Garches</option>
                </select>
              </>
            )}
            
            <button
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeView === 'suppliers' && renderSuppliersView()}
          {activeView === 'orders' && renderOrdersView()}
          {activeView === 'transfers' && <div>Transfers view coming soon...</div>}
          {activeView === 'analytics' && renderAnalyticsView()}
        </div>
      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveSupplier(supplierFormData);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({...supplierFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                  <input
                    type="text"
                    value={supplierFormData.company_name}
                    onChange={(e) => setSupplierFormData({...supplierFormData, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personne de contact</label>
                  <input
                    type="text"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({...supplierFormData, contact_person: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({...supplierFormData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({...supplierFormData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone secondaire</label>
                  <input
                    type="tel"
                    value={supplierFormData.phone_secondary}
                    onChange={(e) => setSupplierFormData({...supplierFormData, phone_secondary: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({...supplierFormData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData({...supplierFormData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                  <input
                    type="text"
                    value={supplierFormData.postal_code}
                    onChange={(e) => setSupplierFormData({...supplierFormData, postal_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Délai de livraison (jours)</label>
                  <input
                    type="number"
                    value={supplierFormData.delivery_delay}
                    onChange={(e) => setSupplierFormData({...supplierFormData, delivery_delay: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commande minimum</label>
                  <input
                    type="number"
                    step="0.01"
                    value={supplierFormData.minimum_order}
                    onChange={(e) => setSupplierFormData({...supplierFormData, minimum_order: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={supplierFormData.notes}
                  onChange={(e) => setSupplierFormData({...supplierFormData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mt-4 flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={supplierFormData.is_active}
                    onChange={(e) => setSupplierFormData({...supplierFormData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  Actif
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={supplierFormData.is_preferred}
                    onChange={(e) => setSupplierFormData({...supplierFormData, is_preferred: e.target.checked})}
                    className="mr-2"
                  />
                  Fournisseur préféré
                </label>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {selectedSupplier ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersModule;
