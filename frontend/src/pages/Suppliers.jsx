import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PrinterIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Suppliers() {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    payment_terms: '',
    notes: ''
  });

  const [orderFormData, setOrderFormData] = useState({
    supplier: '',
    store: 'ville_avray',
    expected_delivery_date: '',
    status: 'draft',
    items: [],
    notes: '',
    shipping_cost: 0
  });

  const [newItem, setNewItem] = useState({
    product: '',
    quantity: 1,
    unit_price: 0
  });

  const orderStatusConfig = {
    draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
    sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
    confirmed: { label: 'Confirmé', color: 'bg-indigo-100 text-indigo-800' },
    shipped: { label: 'Expédié', color: 'bg-yellow-100 text-yellow-800' },
    received: { label: 'Reçu', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' }
  };

  const storeLabels = {
    ville_avray: "Ville d'Avray",
    garches: 'Garches'
  };

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers/suppliers/');
      const data = response.data;
      setSuppliers(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des fournisseurs', 'error');
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await api.get('/suppliers/purchase-orders/');
      const data = response.data;
      setPurchaseOrders(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des commandes', 'error');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      const data = response.data;
      setProducts(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };


  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // Supplier Functions
  const openSupplierModal = (supplier = null) => {
    if (supplier) {
      setSelectedSupplier(supplier);
      setSupplierFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        postal_code: supplier.postal_code || '',
        country: supplier.country || 'France',
        payment_terms: supplier.payment_terms || '',
        notes: supplier.notes || ''
      });
    } else {
      setSelectedSupplier(null);
      setSupplierFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'France',
        payment_terms: '',
        notes: ''
      });
    }
    setShowSupplierModal(true);
  };

  const handleSubmitSupplier = async (e) => {
    e.preventDefault();
    try {
      if (selectedSupplier) {
        await api.put(`/suppliers/suppliers/${selectedSupplier.id}/`, supplierFormData);
        showNotification('Fournisseur mis à jour avec succès');
      } else {
        await api.post('/suppliers/suppliers/', supplierFormData);
        showNotification('Fournisseur créé avec succès');
      }
      fetchSuppliers();
      setShowSupplierModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      try {
        await api.delete(`/suppliers/suppliers/${id}/`);
        showNotification('Fournisseur supprimé avec succès');
        fetchSuppliers();
      } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  // Order Functions
  const openOrderModal = (order = null) => {
    if (order) {
      setSelectedOrder(order);
      setOrderFormData({
        supplier: order.supplier.id,
        store: order.store,
        expected_delivery_date: order.expected_delivery_date || '',
        status: order.status,
        items: order.items || [],
        notes: order.notes || '',
        shipping_cost: order.shipping_cost || 0
      });
    } else {
      setSelectedOrder(null);
      setOrderFormData({
        supplier: '',
        store: 'ville_avray',
        expected_delivery_date: '',
        status: 'draft',
        items: [],
        notes: '',
        shipping_cost: 0
      });
    }
    setShowOrderModal(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    try {
      if (selectedOrder) {
        await api.put(`/suppliers/purchase-orders/${selectedOrder.id}/`, orderFormData);
        showNotification('Commande mise à jour avec succès');
      } else {
        await api.post('/suppliers/purchase-orders/', orderFormData);
        showNotification('Commande créée avec succès');
      }
      fetchPurchaseOrders();
      setShowOrderModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      try {
        await api.delete(`/suppliers/purchase-orders/${id}/`);
        showNotification('Commande supprimée avec succès');
        fetchPurchaseOrders();
      } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handlePrintOrder = async (orderId) => {
    try {
      const response = await api.get(`/suppliers/purchase-orders/${orderId}/print/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bon_commande_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Bon de commande téléchargé');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de l\'impression', 'error');
    }
  };

  const handleReceiveOrder = async (orderId) => {
    if (window.confirm('Confirmer la réception de cette commande ? Le stock sera automatiquement mis à jour.')) {
      try {
        await api.post(`/suppliers/purchase-orders/${orderId}/receive/`);
        showNotification('Commande reçue et stock mis à jour avec succès');
        fetchPurchaseOrders();
      } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la réception', 'error');
      }
    }
  };

  const handleAddItem = () => {
    if (newItem.product && newItem.quantity > 0 && newItem.unit_price > 0) {
      const product = products.find(p => p.id === parseInt(newItem.product));
      if (product) {
        setOrderFormData({
          ...orderFormData,
          items: [
            ...orderFormData.items,
            {
              product: product.id,
              product_name: product.name,
              quantity: newItem.quantity,
              unit_price: newItem.unit_price
            }
          ]
        });
        setNewItem({ product: '', quantity: 1, unit_price: 0 });
      }
    }
  };

  const handleRemoveItem = (index) => {
    const updatedItems = orderFormData.items.filter((_, i) => i !== index);
    setOrderFormData({ ...orderFormData, items: updatedItems });
  };

  const calculateOrderTotal = () => {
    const itemsTotal = orderFormData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price), 
      0
    );
    return itemsTotal + (orderFormData.shipping_cost || 0);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.city && supplier.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearch = 
      order.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesStore = filterStore === 'all' || order.store === filterStore;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fournisseurs & Commandes</h1>
        <button
          onClick={() => activeTab === 'suppliers' ? openSupplierModal() : openOrderModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5" />
          {activeTab === 'suppliers' ? 'Nouveau fournisseur' : 'Nouvelle commande'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'suppliers'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Fournisseurs
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'orders'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Commandes
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className={`grid grid-cols-1 ${activeTab === 'orders' ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {activeTab === 'orders' && (
            <>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyé</option>
                <option value="confirmed">Confirmé</option>
                <option value="shipped">Expédié</option>
                <option value="received">Reçu</option>
                <option value="cancelled">Annulé</option>
              </select>
              <select
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les magasins</option>
                <option value="ville_avray">Ville d'Avray</option>
                <option value="garches">Garches</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'suppliers' ? (
        // Suppliers Table
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ville</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{supplier.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.contact_person || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.city || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openSupplierModal(supplier)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Orders Table
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Magasin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livraison prévue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.reference_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.supplier.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{storeLabels[order.store]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.expected_delivery_date 
                        ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.total_amount.toFixed(2)}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${orderStatusConfig[order.status].color}`}>
                        {orderStatusConfig[order.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePrintOrder(order.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <PrinterIcon className="w-5 h-5" />
                        </button>
                        {(order.status === 'confirmed' || order.status === 'shipped') && (
                          <button
                            onClick={() => handleReceiveOrder(order.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => openOrderModal(order)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {selectedSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <form onSubmit={handleSubmitSupplier}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                    <input
                      type="text"
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personne de contact</label>
                    <input
                      type="text"
                      value={supplierFormData.contact_person}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={supplierFormData.phone}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
                    <input
                      type="text"
                      value={supplierFormData.country}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, country: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                    <input
                      type="text"
                      value={supplierFormData.address}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                    <input
                      type="text"
                      value={supplierFormData.city}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Code postal</label>
                    <input
                      type="text"
                      value={supplierFormData.postal_code}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conditions de paiement</label>
                    <input
                      type="text"
                      value={supplierFormData.payment_terms}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, payment_terms: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 30 jours net"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={supplierFormData.notes}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedSupplier ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {selectedOrder ? 'Modifier la commande' : 'Nouvelle commande'}
              </h2>
              <form onSubmit={handleSubmitOrder}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur *</label>
                    <select
                      value={orderFormData.supplier}
                      onChange={(e) => setOrderFormData({ ...orderFormData, supplier: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Magasin *</label>
                    <select
                      value={orderFormData.store}
                      onChange={(e) => setOrderFormData({ ...orderFormData, store: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="ville_avray">Ville d'Avray</option>
                      <option value="garches">Garches</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de livraison prévue</label>
                    <input
                      type="date"
                      value={orderFormData.expected_delivery_date}
                      onChange={(e) => setOrderFormData({ ...orderFormData, expected_delivery_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select
                      value={orderFormData.status}
                      onChange={(e) => setOrderFormData({ ...orderFormData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="sent">Envoyé</option>
                      <option value="confirmed">Confirmé</option>
                      <option value="shipped">Expédié</option>
                      <option value="received">Reçu</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frais de port (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderFormData.shipping_cost}
                      onChange={(e) => setOrderFormData({ ...orderFormData, shipping_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">Articles</h3>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={newItem.product}
                      onChange={(e) => setNewItem({ ...newItem, product: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Qté"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) })}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Prix"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Ajouter
                    </button>
                  </div>
                  {orderFormData.items.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantité</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix unitaire</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orderFormData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">{item.product_name}</td>
                              <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-right">{item.unit_price.toFixed(2)}€</td>
                              <td className="px-4 py-2 text-sm text-right font-semibold">
                                {(item.quantity * item.unit_price).toFixed(2)}€
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50">
                            <td colSpan="3" className="px-4 py-2 text-right text-sm">Sous-total</td>
                            <td className="px-4 py-2 text-right text-sm font-semibold">
                              {orderFormData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}€
                            </td>
                            <td></td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td colSpan="3" className="px-4 py-2 text-right text-sm">Frais de port</td>
                            <td className="px-4 py-2 text-right text-sm">{(orderFormData.shipping_cost || 0).toFixed(2)}€</td>
                            <td></td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td colSpan="3" className="px-4 py-2 text-right">Total</td>
                            <td className="px-4 py-2 text-right">{calculateOrderTotal().toFixed(2)}€</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={orderFormData.notes}
                    onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedOrder ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Détails de la commande</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Référence</p>
                  <p className="text-lg font-semibold">{selectedOrder.reference_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fournisseur</p>
                    <p>{selectedOrder.supplier.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Magasin</p>
                    <p>{storeLabels[selectedOrder.store]}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date de commande</p>
                    <p>{new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Livraison prévue</p>
                    <p>
                      {selectedOrder.expected_delivery_date 
                        ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </p>
                  </div>
                </div>
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Articles</p>
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantité</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix unitaire</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.unit_price.toFixed(2)}€</td>
                            <td className="px-4 py-2 text-sm text-right">
                              {(item.quantity * item.unit_price).toFixed(2)}€
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td colSpan="3" className="px-4 py-2 text-right text-sm">Frais de port</td>
                          <td className="px-4 py-2 text-right text-sm">
                            {(selectedOrder.shipping_cost || 0).toFixed(2)}€
                          </td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan="3" className="px-4 py-2 text-right">Total</td>
                          <td className="px-4 py-2 text-right">{selectedOrder.total_amount.toFixed(2)}€</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}