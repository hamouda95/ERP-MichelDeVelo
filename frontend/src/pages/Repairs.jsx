import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { repairsAPI, clientsAPI, productsAPI } from '../services/api';

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
  const [loading, setLoading] = useState(false);
  
  // États pour la recherche de clients
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');
  const clientSearchRef = useRef(null);
  // Filtres supplémentaires
const [filterClientName, setFilterClientName] = useState('');
const [filterDate, setFilterDate] = useState('');


  const [formData, setFormData] = useState({
    client: '',
    store: 'Veuillez sélectionner un magasin ',
    bike_brand: '',
    bike_model: '',
    bike_serial_number: '',
    description: '',
    diagnosis: '',
    estimated_cost: '',
    final_cost: '',
    status: 'Veuillez sélectionner un statut',
    priority: 'Veuillez sélectionner la priorité',
    parts_needed: [],
    notes: '',
    estimated_completion: ''
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
    delivered: { label: 'Livrée', color: 'bg-purple-100 text-purple-800' },
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

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const fetchRepairs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await repairsAPI.getAll();
      const data = response.data;
      
      const repairsArray = Array.isArray(data) ? data :
                          Array.isArray(data.results) ? data.results :
                          Array.isArray(data.repairs) ? data.repairs : [];
      
      setRepairs(repairsArray);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des réparations', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsAPI.getAll();
      const data = response.data;
      
      const clientsArray = Array.isArray(data) ? data :
                          Array.isArray(data.results) ? data.results :
                          Array.isArray(data.clients) ? data.clients : [];
      
      setClients(clientsArray);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des clients', 'error');
    }
  }, [showNotification]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await productsAPI.getAll();
      const data = response.data;
      
      const productsArray = Array.isArray(data) ? data :
                           Array.isArray(data.results) ? data.results :
                           Array.isArray(data.products) ? data.products : [];
      
      setProducts(productsArray);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors du chargement des produits', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    fetchRepairs();
    fetchClients();
    fetchProducts();
  }, [fetchRepairs, fetchClients, fetchProducts]);

  // Gestion du clic en dehors du dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche de clients en temps réel
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearch.length >= 2) {
        try {
          const filtered = clients.filter(client => {
            const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
            const email = client.email.toLowerCase();
            const phone = client.phone || '';
            const searchLower = clientSearch.toLowerCase();
            return fullName.includes(searchLower) || 
                   email.includes(searchLower) || 
                   phone.includes(searchLower);
          });
          setClientSearchResults(filtered);
          setShowClientDropdown(true);
        } catch (error) {
          console.error('Erreur lors de la recherche:', error);
        }
      } else {
        setClientSearchResults([]);
        setShowClientDropdown(false);
      }
    };

    const debounceTimer = setTimeout(searchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [clientSearch, clients]);

  const handleSelectClient = (client) => {
    setFormData({ ...formData, client: client.id });
    setSelectedClientName(`${client.first_name} ${client.last_name}`);
    setClientSearch(`${client.first_name} ${client.last_name}`);
    setShowClientDropdown(false);
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
        notes: repair.notes || '',
        estimated_completion: repair.estimated_completion || ''
      });
      setSelectedClientName(repair.client.name || `${repair.client.first_name} ${repair.client.last_name}`);
      setClientSearch(repair.client.name || `${repair.client.first_name} ${repair.client.last_name}`);
    } else {
      setSelectedRepair(null);
      setFormData({
        client: '',
        store: 'Veuillez sélectionner un magasin',
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
        notes: '',
        estimated_completion: ''
      });
      setSelectedClientName('');
      setClientSearch('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client) {
      showNotification('Veuillez sélectionner un client', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Préparer les données en convertissant les champs numériques
      const dataToSend = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0,
        final_cost: formData.final_cost ? parseFloat(formData.final_cost) : 0,
      };
      
      if (selectedRepair) {
        await repairsAPI.update(selectedRepair.id, dataToSend);
        showNotification('Réparation mise à jour avec succès');
      } else {
        await repairsAPI.create(dataToSend);
        showNotification('Réparation créée avec succès');
      }
      
      await fetchRepairs();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification(
        error.response?.data?.message || 'Erreur lors de la sauvegarde',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette réparation ?')) {
      try {
        setLoading(true);
        await repairsAPI.delete(id);
        showNotification('Réparation supprimée avec succès');
        await fetchRepairs();
      } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = async (repairId) => {
    try {
      const response = await repairsAPI.print(repairId);
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
              quantity: newPart.quantity,
              unit_price: product.price
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
      repair.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.bike_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.bike_model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || repair.status === filterStatus;
    const matchesStore = filterStore === 'all' || repair.store === filterStore;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  const handleLocalPrint = (repair) => {
  const ticketHTML = `
    <html>
      <head>
        <title>Reçu de prise en charge</title>
        <style>
          @media print {
            @page { size: 80mm auto; margin: 5mm; }
            body {
              font-family: 'Inter', sans-serif;
              font-size: 12px;
              width: 72mm;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .small { font-size: 10px; }
            .ticket-header { margin-bottom: 6px; }
            .ticket-section { margin-bottom: 6px; }
            .ticket-footer { margin-top: 12px; font-size: 10px; text-align: center; }
          }

          body {
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            width: 72mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .ticket-header { margin-bottom: 6px; }
          .ticket-section { margin-bottom: 6px; }
          .ticket-footer { margin-top: 12px; font-size: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center ticket-header bold">🚲 Atelier Vélo - ${storeLabels[repair.store]}</div>
        <div class="center small">${new Date(repair.created_at).toLocaleDateString('fr-FR')} ${new Date(repair.created_at).toLocaleTimeString('fr-FR')}</div>
        <div class="line"></div>

        <div class="ticket-section"><span class="bold">Réf:</span> ${repair.reference_number || '—'}</div>
        <div class="ticket-section"><span class="bold">Client:</span> ${repair.client?.name || repair.client?.first_name + ' ' + repair.client?.last_name}</div>
        <div class="ticket-section"><span class="bold">Vélo:</span> ${repair.bike_brand} ${repair.bike_model}</div>
        ${repair.bike_serial_number ? `<div class="ticket-section"><span class="bold">N° série:</span> ${repair.bike_serial_number}</div>` : ''}
        <div class="line"></div>

        <div class="ticket-section"><span class="bold">Description:</span></div>
        <div class="ticket-section">${repair.description}</div>
        <div class="line"></div>

        <div class="ticket-section"><span class="bold">Coût estimé:</span> ${repair.estimated_cost ? repair.estimated_cost + ' €' : '—'}</div>
        <div class="ticket-section"><span class="bold">Statut:</span> ${statusConfig[repair.status]?.label || repair.status}</div>

        <div class="line"></div>
        <div class="ticket-footer">Merci de votre confiance !</div>
        <div class="ticket-footer small">Conservez ce reçu pour le retrait de votre vélo</div>
        <div class="ticket-footer small">Signature client : __________________</div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  printWindow.document.write(ticketHTML);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};



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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Recherche globale */}
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

          {/* Statut */}
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

          {/* Magasin */}
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les magasins</option>
            <option value="ville_avray">Ville d'Avray</option>
            <option value="garches">Garches</option>
          </select>

          {/* Filtre par nom de client */}
          <input
            type="text"
            placeholder="Nom du client..."
            value={filterClientName}
            onChange={(e) => setFilterClientName(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Filtre par date */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>


      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune réparation trouvée</p>
          </div>
        ) : (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {repair.reference_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {repair.client?.name || `${repair.client?.first_name || ''} ${repair.client?.last_name || ''}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {repair.bike_brand} {repair.bike_model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {storeLabels[repair.store]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[repair.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusConfig[repair.status]?.label || repair.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityConfig[repair.priority]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {priorityConfig[repair.priority]?.label || repair.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {repair.created_at ? new Date(repair.created_at).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {repair.estimated_cost ? `${repair.estimated_cost}€` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        

                        <button
                          onClick={() => {
                            setSelectedRepair(repair);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openModal(repair)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleLocalPrint(repair)}
                          className="text-green-600 hover:text-green-900"
                          title="Imprimer le ticket"
                        >
                          <PrinterIcon className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleDelete(repair.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
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
        )}
      </div>

      {/* Create/Edit Modal */}
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">
          {selectedRepair ? 'Modifier la réparation' : 'Nouvelle réparation'}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Client et Magasin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Client */}
            <div ref={clientSearchRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    if (!e.target.value) {
                      setFormData({ ...formData, client: '' });
                      setSelectedClientName('');
                    }
                  }}
                  onFocus={() => {
                    if (clientSearchResults.length > 0) {
                      setShowClientDropdown(true);
                    }
                  }}
                  placeholder="Rechercher un client (nom, email, téléphone)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                {/* Dropdown des résultats */}
                {showClientDropdown && clientSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientSearchResults.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {client.first_name} {client.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.email} {client.phone && `• ${client.phone}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message si aucun résultat */}
                {showClientDropdown && clientSearch.length >= 2 && clientSearchResults.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    Aucun client trouvé
                  </div>
                )}

                {/* Indicateur de sélection */}
                {selectedClientName && (
                  <div className="mt-1 text-sm text-green-600">
                    ✓ Client sélectionné: {selectedClientName}
                  </div>
                )}
              </div>
            </div>

            {/* Magasin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Magasin *
              </label>
              <select
                required
                value={formData.store}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Veuillez sélectionner un magasin</option>
                <option value="ville_avray">Ville d'Avray</option>
                <option value="garches">Garches</option>
              </select>
            </div>

          </div>
          {/* Produit déposé, Priorité et Coût estimé sur la même ligne */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Produit déposé */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Produit déposé *</label>
              <input
                type="text"
                required
                value={formData.bike_brand}
                onChange={(e) => setFormData({ ...formData, bike_brand: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Priorité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priorité *</label>
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

           
{/* Budget MAX */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Budget MAX (€)</label>
  <input
    type="number"
    step="0.01"
    min="0"
    value={formData.max_budget || ''}
    onChange={(e) => setFormData({ ...formData, max_budget: parseFloat(e.target.value) })}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    placeholder="Saisir le budget maximum"
  />
</div>

{/* Coût estimé */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Coût estimé (€)</label>
  <input
    type="number"
    step="0.01"
    min="0"
    value={formData.estimated_cost || ''}
    onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) })}
    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 
      ${
        formData.max_budget
          ? formData.estimated_cost > formData.max_budget
            ? 'bg-red-100'
            : 'bg-green-100'
          : ''
      }`}
    placeholder="Saisir le coût estimé"
  />
</div>


          </div>

          

          {/* Pièces nécessaires */}
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
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.price}€
                  </option>
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

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'En cours...' : (selectedRepair ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}


      {/* Detail Modal */}
{showDetailModal && selectedRepair && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Détails de la réparation</h2>

        {/* Client et Magasin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Client</p>
            <p>{selectedRepair.client?.name || `${selectedRepair.client?.first_name} ${selectedRepair.client?.last_name}`}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Magasin</p>
            <p>{storeLabels[selectedRepair.store]}</p>
          </div>
        </div>

        {/* Produit déposé, Priorité, Coût estimé */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Produit déposé</p>
            <p>{selectedRepair.bike_brand} {selectedRepair.bike_model}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Priorité</p>
            <p>{selectedRepair.priority}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Coût estimé (€)</p>
            <p>{selectedRepair.estimated_cost ? `${selectedRepair.estimated_cost}€` : '-'}</p>
          </div>
        </div>

        {/* Pièces nécessaires */}
        {selectedRepair.parts_needed && selectedRepair.parts_needed.length > 0 && (
          <div className="mb-4">
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

        {/* Notes / Description / Diagnostic */}
        <div className="mb-4">
          {selectedRepair.description && (
            <>
              <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
              <p>{selectedRepair.description}</p>
            </>
          )}
          {selectedRepair.diagnosis && (
            <>
              <p className="text-sm font-medium text-gray-500 mb-1 mt-2">Diagnostic</p>
              <p>{selectedRepair.diagnosis}</p>
            </>
          )}
          {selectedRepair.notes && (
            <>
              <p className="text-sm font-medium text-gray-500 mb-1 mt-2">Notes</p>
              <p>{selectedRepair.notes}</p>
            </>
          )}
        </div>

        {/* Coût final et Statut */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Coût final (€)</p>
            <p>{selectedRepair.final_cost ? `${selectedRepair.final_cost}€` : '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Statut</p>
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[selectedRepair.status]?.color || 'bg-gray-100 text-gray-800'}`}>
              {statusConfig[selectedRepair.status]?.label || selectedRepair.status}
            </span>
          </div>
        </div>

        {/* Bouton fermer */}
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
