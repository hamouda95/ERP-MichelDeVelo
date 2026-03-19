import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { suppliersAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStore, setFilterStore] = useState('all');

  const [formData, setFormData] = useState({
    supplier: '',
    store: 'ville_avray',
    expected_delivery_date: '',
    notes: '',
    shipping_cost: 0,
    items: [],
  });

  const [newItem, setNewItem] = useState({
    product: '',
    quantity: 1,
    unit_price: 0,
  });

  const orderStatusConfig = {
    draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
    sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800', icon: PaperAirplaneIcon },
    confirmed: { label: 'Confirmé', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircleIcon },
    partial: { label: 'Partiellement reçu', color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
    received: { label: 'Reçu', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        suppliersAPI.getPurchaseOrders(),
        suppliersAPI.getAll(),
        productsAPI.getAll(),
      ]);
      
      setOrders(ordersRes.data.results || ordersRes.data);
      setSuppliers(suppliersRes.data.results || suppliersRes.data);
      setProducts(productsRes.data.results || productsRes.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setError('Impossible de charger les données');
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.items.length === 0) {
        toast.error('Ajoutez au moins un article à la commande');
        return;
      }

      const orderData = {
        ...formData,
        expected_delivery_date: formData.expected_delivery_date || new Date().toISOString().split('T')[0],
        items: formData.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      await suppliersAPI.createPurchaseOrder(orderData);
      toast.success('Commande créée avec succès');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur création commande:', error);
      toast.error('Erreur lors de la création');
    }
  };

  const sendToSupplier = async (orderId) => {
    try {
      await suppliersAPI.sendToSupplier(orderId);
      toast.success('Commande envoyée au fournisseur');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const confirmOrder = async (orderId) => {
    try {
      await suppliersAPI.confirmOrder(orderId);
      toast.success('Commande confirmée');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la confirmation');
    }
  };

  const addItem = () => {
    if (!newItem.product || newItem.quantity <= 0 || newItem.unit_price <= 0) {
      toast.error('Remplissez tous les champs de l\'article');
      return;
    }

    const product = products.find(p => p.id == newItem.product);
    const item = {
      id: Date.now(),
      product: newItem.product,
      product_name: product?.name || '',
      product_reference: product?.reference || '',
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total_price: newItem.quantity * newItem.unit_price,
    };

    setFormData({
      ...formData,
      items: [...formData.items, item],
    });

    setNewItem({ product: '', quantity: 1, unit_price: 0 });
  };

  const removeItem = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== itemId),
    });
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      store: 'ville_avray',
      expected_delivery_date: '',
      notes: '',
      shipping_cost: 0,
      items: [],
    });
    setNewItem({ product: '', quantity: 1, unit_price: 0 });
  };

  const calculateTotal = () => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + item.total_price, 0);
    return itemsTotal + parseFloat(formData.shipping_cost || 0);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.purchase_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesStore = filterStore === 'all' || order.store === filterStore;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement des commandes..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Passage de Commandes</h1>
          <p className="text-gray-600 mt-1">Créez et gérez vos commandes d'achat</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nouvelle Commande
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(orderStatusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
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
        </div>
      </div>

      {/* Liste des commandes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commande
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fournisseur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date livraison
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => {
              const StatusIcon = orderStatusConfig[order.status]?.icon || ClockIcon;
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.purchase_order_number}</div>
                      <div className="text-sm text-gray-500">{order.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.supplier?.name}</div>
                    <div className="text-sm text-gray-500">{order.items?.length || 0} articles</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')}
                    {order.actual_delivery_date && (
                      <div className="text-xs text-green-600">
                        Reçu: {new Date(order.actual_delivery_date).toLocaleDateString('fr-FR')}
                      </div>
                    )}
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
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    {order.status === 'draft' && (
                      <button
                        onClick={() => sendToSupplier(order.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Envoyer au fournisseur"
                      >
                        <PaperAirplaneIcon className="w-5 h-5" />
                      </button>
                    )}
                    {order.status === 'sent' && (
                      <button
                        onClick={() => confirmOrder(order.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Confirmer la commande"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal création commande */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nouvelle Commande d'Achat</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fournisseur *</label>
                  <select
                    required
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers.filter(s => s.is_active).map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.is_preferred && '⭐'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Magasin *</label>
                  <select
                    required
                    value={formData.store}
                    onChange={(e) => setFormData({...formData, store: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="ville_avray">Ville d'Avray</option>
                    <option value="garches">Garches</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date livraison prévue</label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Ajout d'articles */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Articles de la commande</h4>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Produit *</label>
                      <select
                        value={newItem.product}
                        onChange={(e) => {
                          const product = products.find(p => p.id == e.target.value);
                          setNewItem({
                            ...newItem,
                            product: e.target.value,
                            unit_price: product?.price_ht || 0,
                          });
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.filter(p => p.is_active).map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.reference}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantité *</label>
                      <input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Prix unitaire (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addItem}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Liste des articles */}
                  {formData.items.length > 0 && (
                    <div className="mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.unit_price.toFixed(2)} €</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.total_price.toFixed(2)} €</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Supprimer
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Frais de port et notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Frais de port (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipping_cost}
                    onChange={(e) => setFormData({...formData, shipping_cost: parseFloat(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={1}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total TTC:</span>
                  <span className="text-2xl font-bold text-blue-600">{calculateTotal().toFixed(2)} €</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails commande */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Détails de la commande {selectedOrder.purchase_order_number}</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Informations générales</h4>
                  <p><strong>Fournisseur:</strong> {selectedOrder.supplier?.name}</p>
                  <p><strong>Magasin:</strong> {selectedOrder.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}</p>
                  <p><strong>Date commande:</strong> {new Date(selectedOrder.order_date).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Date livraison prévue:</strong> {new Date(selectedOrder.expected_delivery_date).toLocaleDateString('fr-FR')}</p>
                  {selectedOrder.actual_delivery_date && (
                    <p><strong>Date livraison réelle:</strong> {new Date(selectedOrder.actual_delivery_date).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Statut et montants</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      orderStatusConfig[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {orderStatusConfig[selectedOrder.status]?.label || selectedOrder.status}
                    </span>
                  </div>
                  <p><strong>Sous-total HT:</strong> {parseFloat(selectedOrder.subtotal_ht || 0).toLocaleString('fr-FR')} €</p>
                  <p><strong>Frais de port:</strong> {parseFloat(selectedOrder.shipping_cost || 0).toLocaleString('fr-FR')} €</p>
                  <p><strong>Total TTC:</strong> {parseFloat(selectedOrder.total_ttc || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Actions disponibles</h4>
                  <div className="space-y-2 mt-2">
                    {selectedOrder.status === 'draft' && (
                      <button
                        onClick={() => sendToSupplier(selectedOrder.id)}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Envoyer au fournisseur
                      </button>
                    )}
                    {selectedOrder.status === 'sent' && (
                      <button
                        onClick={() => confirmOrder(selectedOrder.id)}
                        className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Confirmer la commande
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900">Notes</h4>
                  <p className="mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Articles de la commande</h4>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reçu</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.product_reference}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity_ordered || item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{parseFloat(item.unit_price_ht || item.unit_price).toFixed(2)} €</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{parseFloat(item.total_price || (item.quantity * item.unit_price)).toFixed(2)} €</td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {item.quantity_received || 0} / {item.quantity_ordered || item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
