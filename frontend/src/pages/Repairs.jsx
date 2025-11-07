import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Repairs() {
  const [repairs, setRepairs] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    client: '',
    store: 'ville_avray',
    bike_brand: '',
    bike_model: '',
    bike_serial_number: '',
    description: '',
    diagnosis: '',
    estimated_cost: '',
    final_cost: '',
    status: 'pending',
    priority: 'normal',
    parts_needed: [],
    notes: ''
  });

  const [newPart, setNewPart] = useState({
    product: '',
    quantity: 1
  });

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    waiting_parts: { label: 'Attente pièces', color: 'bg-gray-100 text-gray-800' },
    completed: { label: 'Terminée', color: 'bg-green-100 text-green-800' },
    delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
  };

  const priorityConfig = {
    low: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
    normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
    high: { label: 'Haute', color: 'bg-orange-100 text-orange-800' },
    urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
  };

  const storeLabels = {
    ville_avray: "Ville d'Avray",
    garches: 'Garches'
  };

  useEffect(() => {
    fetchRepairs();
    fetchClients();
    fetchProducts();
  }, []);

  const fetchRepairs = async () => {
    try {
      const response = await api.get('/repairs/');
      const data = response.data;

      // Detect the correct array field (handles paginated or wrapped data)
      const repairsArray =
        Array.isArray(data) ? data :
        Array.isArray(data.results) ? data.results :
        Array.isArray(data.repairs) ? data.repairs :
        [];

      setRepairs(repairsArray);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des réparations', 'error');
    }
  };


  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      const data = response.data;

      // Handle paginated or nested API responses safely
      const clientsArray =
        Array.isArray(data) ? data :
        Array.isArray(data.results) ? data.results :
        Array.isArray(data.clients) ? data.clients :
        [];

      setClients(clientsArray);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };


  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      const data = response.data;

      // Handle different possible API shapes
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

  const openModal = (repair = null) => {
    if (repair) {
      setSelectedRepair(repair);
      setFormData({
        client: repair.client.id,
        store: repair.store,
        bike_brand: repair.bike_brand,
        bike_model: repair.bike_model,
        bike_serial_number: repair.bike_serial_number || '',
        description: repair.description,
        diagnosis: repair.diagnosis || '',
        estimated_cost: repair.estimated_cost || '',
        final_cost: repair.final_cost || '',
        status: repair.status,
        priority: repair.priority,
        parts_needed: repair.parts_needed || [],
        notes: repair.notes || ''
      });
    } else {
      setSelectedRepair(null);
      setFormData({
        client: '',
        store: 'ville_avray',
        bike_brand: '',
        bike_model: '',
        bike_serial_number: '',
        description: '',
        diagnosis: '',
        estimated_cost: '',
        final_cost: '',
        status: 'pending',
        priority: 'normal',
        parts_needed: [],
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedRepair) {
        await api.put(`/repairs/${selectedRepair.id}/`, formData);
        showNotification('Réparation mise à jour avec succès');
      } else {
        await api.post('/repairs/', formData);
        showNotification('Réparation créée avec succès');
      }
      fetchRepairs();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette réparation ?')) {
      try {
        await api.delete(`/repairs/${id}/`);
        showNotification('Réparation supprimée avec succès');
        fetchRepairs();
      } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handlePrint = async (repairId) => {
    try {
      const response = await api.get(`/repairs/${repairId}/print/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reparation_${repairId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Bon de réparation téléchargé');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de l\'impression', 'error');
    }
  };

  const handleAddPart = () => {
    if (newPart.product && newPart.quantity > 0) {
      const product = products.find(p => p.id === parseInt(newPart.product));
      if (product) {
        setFormData({
          ...formData,
          parts_needed: [
            ...formData.parts_needed,
            {
              product: product.id,
              product_name: product.name,
              quantity: newPart.quantity
            }
          ]
        });
        setNewPart({ product: '', quantity: 1 });
      }
    }
  };

  const handleRemovePart = (index) => {
    const updatedParts = formData.parts_needed.filter((_, i) => i !== index);
    setFormData({ ...formData, parts_needed: updatedParts });
  };

  const filteredRepairs = repairs.filter(repair => {
    const matchesSearch = 
      repair.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.bike_brand.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || repair.status === filterStatus;
    const matchesStore = filterStore === 'all' || repair.store === filterStore;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Réparations</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5" />
          Nouvelle réparation
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
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="waiting_parts">Attente pièces</option>
            <option value="completed">Terminée</option>
            <option value="delivered">Livrée</option>
            
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vélo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Magasin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût estimé</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRepairs.map((repair) => (
                <tr key={repair.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{repair.reference_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{repair.client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {repair.bike_brand} {repair.bike_model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{storeLabels[repair.store]}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[repair.status].color}`}>
                      {statusConfig[repair.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityConfig[repair.priority].color}`}>
                      {priorityConfig[repair.priority].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(repair.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {repair.estimated_cost ? `${repair.estimated_cost}€` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setSelectedRepair(repair); setShowDetailModal(true); }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handlePrint(repair.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <PrinterIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openModal(repair)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(repair.id)}
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {selectedRepair ? 'Modifier la réparation' : 'Nouvelle réparation'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                        <option key={client.id} value={client.id}>{client.name}</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marque du vélo *</label>
                    <input
                      type="text"
                      value={formData.bike_brand}
                      onChange={(e) => setFormData({ ...formData, bike_brand: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modèle du vélo *</label>
                    <input
                      type="text"
                      value={formData.bike_model}
                      onChange={(e) => setFormData({ ...formData, bike_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de série</label>
                    <input
                      type="text"
                      value={formData.bike_serial_number}
                      onChange={(e) => setFormData({ ...formData, bike_serial_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description du problème *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnostic</label>
                    <textarea
                      value={formData.diagnosis}
                      onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">En attente</option>
                      <option value="in_progress">En cours</option>
                      <option value="waiting_parts">Attente pièces</option>
                      <option value="completed">Terminée</option>
                      <option value="delivered">Livrée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Basse</option>
                      <option value="normal">Normale</option>
                      <option value="high">Haute</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Coût estimé (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Coût final (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.final_cost}
                      onChange={(e) => setFormData({ ...formData, final_cost: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Parts Section */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">Pièces nécessaires</h3>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={newPart.product}
                      onChange={(e) => setNewPart({ ...newPart, product: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name} - {product.price}€</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) })}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Qté"
                    />
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Ajouter
                    </button>
                  </div>
                  {formData.parts_needed.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantité</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.parts_needed.map((part, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">{part.product_name}</td>
                              <td className="px-4 py-2 text-sm">{part.quantity}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePart(index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="2"
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
                    {selectedRepair ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
jardinage</div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Détails de la réparation</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Référence</p>
                  <p className="text-lg font-semibold">{selectedRepair.reference_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client</p>
                    <p>{selectedRepair.client.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Magasin</p>
                    <p>{storeLabels[selectedRepair.store]}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vélo</p>
                    <p>{selectedRepair.bike_brand} {selectedRepair.bike_model}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Statut</p>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[selectedRepair.status].color}`}>
                      {statusConfig[selectedRepair.status].label}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Description</p>
                  <p>{selectedRepair.description}</p>
                </div>
                {selectedRepair.diagnosis && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Diagnostic</p>
                    <p>{selectedRepair.diagnosis}</p>
                  </div>
                )}
                {selectedRepair.parts_needed && selectedRepair.parts_needed.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Pièces nécessaires</p>
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantité</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedRepair.parts_needed.map((part, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm">{part.product_name}</td>
                            <td className="px-4 py-2 text-sm">{part.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Coût estimé</p>
                    <p>{selectedRepair.estimated_cost ? `${selectedRepair.estimated_cost}€` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Coût final</p>
                    <p>{selectedRepair.final_cost ? `${selectedRepair.final_cost}€` : '-'}</p>
                  </div>
                </div>
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