import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PrinterIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    client: '',
    store: 'ville_avray',
    valid_until: '',
    status: 'draft',
    items: [],
    notes: '',
    discount_amount: 0,
    discount_type: 'amount'
  });

  const [newItem, setNewItem] = useState({
    product: '',
    quantity: 1,
    unit_price: 0,
    discount: 0
  });

  const statusConfig = {
    draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
    sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
    accepted: { label: 'Accepté', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Refusé', color: 'bg-red-100 text-red-800' },
    expired: { label: 'Expiré', color: 'bg-yellow-100 text-yellow-800' },
    converted: { label: 'Converti', color: 'bg-green-100 text-green-800' }
  };

  const storeLabels = {
    ville_avray: "Ville d'Avray",
    garches: 'Garches'
  };

  useEffect(() => {
    fetchQuotes();
    fetchClients();
    fetchProducts();
  }, []);

  const fetchQuotes = async () => {
    try {
      const response = await api.get('/quotes/');
      setQuotes(response.data.results || response.data); // 👈 Handles both formats
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des devis', 'error');
    }
  };


  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      setClients(response.data.results || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };



  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      const data = response.data;

      // Normalize the structure so we always get an array
      const productsArray =
        Array.isArray(data) ? data :
        Array.isArray(data.results) ? data.results :
        Array.isArray(data.products) ? data.products :
        [];

      setProducts(productsArray);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };


  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const openModal = (quote = null) => {
    if (quote) {
      setSelectedQuote(quote);
      setFormData({
        client: quote.client.id,
        store: quote.store,
        valid_until: quote.valid_until,
        status: quote.status,
        items: quote.items || [],
        notes: quote.notes || '',
        discount_amount: quote.discount_amount || 0,
        discount_type: quote.discount_type || 'amount'
      });
    } else {
      setSelectedQuote(null);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      setFormData({
        client: '',
        store: 'ville_avray',
        valid_until: validUntil.toISOString().split('T')[0],
        status: 'draft',
        items: [],
        notes: '',
        discount_amount: 0,
        discount_type: 'amount'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedQuote) {
        await api.put(`/quotes/${selectedQuote.id}/`, formData);
        showNotification('Devis mis à jour avec succès');
      } else {
        await api.post('/quotes/', formData);
        showNotification('Devis créé avec succès');
      }
      fetchQuotes();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      try {
        await api.delete(`/quotes/${id}/`);
        showNotification('Devis supprimé avec succès');
        fetchQuotes();
      } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handlePrint = async (quoteId) => {
    try {
      const response = await api.get(`/quotes/${quoteId}/print/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `devis_${quoteId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Devis téléchargé');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de l\'impression', 'error');
    }
  };

  const handleConvertToOrder = async (quoteId) => {
    if (window.confirm('Voulez-vous convertir ce devis en commande ?')) {
      try {
        await api.post(`/quotes/${quoteId}/convert_to_order/`);
        showNotification('Devis converti en commande avec succès');
        fetchQuotes();
      } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la conversion', 'error');
      }
    }
  };

  const handleAddItem = () => {
    if (newItem.product && newItem.quantity > 0) {
      const product = products.find(p => p.id === parseInt(newItem.product));
      if (product) {
        setFormData({
          ...formData,
          items: [
            ...formData.items,
            {
              product: product.id,
              product_name: product.name,
              quantity: newItem.quantity,
              unit_price: newItem.unit_price || product.price,
              discount: newItem.discount || 0
            }
          ]
        });
        setNewItem({ product: '', quantity: 1, unit_price: 0, discount: 0 });
      }
    }
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    return subtotal - item.discount;
  };

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const discount = formData.discount_type === 'percentage' 
      ? subtotal * (formData.discount_amount / 100)
      : formData.discount_amount;
    return subtotal - discount;
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    const matchesStore = filterStore === 'all' || quote.store === filterStore;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau devis
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="accepted">Accepté</option>
            <option value="rejected">Refusé</option>
            <option value="expired">Expiré</option>
            <option value="converted">Converti</option>
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Magasin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valide jusqu'au</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quote.reference_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{storeLabels[quote.store]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quote.total_amount.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[quote.status].color}`}>
                      {statusConfig[quote.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setSelectedQuote(quote); setShowDetailModal(true); }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handlePrint(quote.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <PrinterIcon className="w-5 h-5" />
                      </button>
                      {quote.status === 'accepted' && (
                        <button
                          onClick={() => handleConvertToOrder(quote.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <ShoppingCartIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => openModal(quote)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(quote.id)}
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

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {selectedQuote ? 'Modifier le devis' : 'Nouveau devis'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
                    <select
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Magasin *</label>
                    <select
                      value={formData.store}
                      onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="ville_avray">Ville d'Avray</option>
                      <option value="garches">Garches</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valide jusqu'au</label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="sent">Envoyé</option>
                      <option value="accepted">Accepté</option>
                      <option value="rejected">Refusé</option>
                      <option value="expired">Expiré</option>
                    </select>
                  </div>
                </div>

                {/* Items Section */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">Articles</h3>
                  <div className="grid grid-cols-12 gap-2 mb-3">
                    <select
                      value={newItem.product}
                      onChange={(e) => {
                        const product = products.find(p => p.id === parseInt(e.target.value));
                        setNewItem({ 
                          ...newItem, 
                          product: e.target.value,
                          unit_price: product ? product.price : 0
                        });
                      }}
                      className="col-span-5 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name} - {product.price}€</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                      className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Qté"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) })}
                      className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Prix"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.discount}
                      onChange={(e) => setNewItem({ ...newItem, discount: parseFloat(e.target.value) })}
                      className="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Remise"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="col-span-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      +
                    </button>
                  </div>
                  {formData.items.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qté</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix unit.</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Remise</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">{item.product_name}</td>
                              <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-right">{item.unit_price.toFixed(2)}€</td>
                              <td className="px-4 py-2 text-sm text-right">{item.discount.toFixed(2)}€</td>
                              <td className="px-4 py-2 text-sm text-right font-semibold">{calculateItemTotal(item).toFixed(2)}€</td>
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
                          <tr className="bg-gray-50 font-semibold">
                            <td colSpan="4" className="px-4 py-2 text-right">Total</td>
                            <td className="px-4 py-2 text-right">{calculateTotal().toFixed(2)}€</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de remise</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="amount">Montant (€)</option>
                      <option value="percentage">Pourcentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remise globale</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedQuote ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Détails du devis</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Référence</p>
                  <p className="text-lg font-semibold">{selectedQuote.reference_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client</p>
                    <p>{selectedQuote.client.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Magasin</p>
                    <p>{storeLabels[selectedQuote.store]}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date de création</p>
                    <p>{new Date(selectedQuote.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Valide jusqu'au</p>
                    <p>{new Date(selectedQuote.valid_until).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                {selectedQuote.items && selectedQuote.items.length > 0 && (
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
                        {selectedQuote.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.unit_price.toFixed(2)}€</td>
                            <td className="px-4 py-2 text-sm text-right">
                              {(item.quantity * item.unit_price - item.discount).toFixed(2)}€
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan="3" className="px-4 py-2 text-right">Total</td>
                          <td className="px-4 py-2 text-right">{selectedQuote.total_amount.toFixed(2)}€</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedQuote.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p>{selectedQuote.notes}</p>
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