/**
 * ============================================================================ 
 * REPAIRS MODULE - VERSION DRAG & DROP CORRIGÉE
 * ============================================================================ 
 * 
 * Drag & drop moderne avec statuts alignés sur le backend
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon, WrenchScrewdriverIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
  MagnifyingGlassIcon, ArrowPathIcon, XMarkIcon, PhotoIcon, ListBulletIcon, ViewColumnsIcon,
  PencilIcon, TrashIcon, QrCodeIcon, PrinterIcon, WrenchScrewdriverIcon as WrenchIcon,
  ShoppingCartIcon, ReceiptIcon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { repairsAPI, clientsAPI, productsAPI, ordersAPI } from '../services/api_consolidated';
import toast from 'react-hot-toast';

// Import des composants
import RepairPartsManager from '../components/RepairPartsManager';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

// Configuration des colonnes Kanban - alignées avec le backend
const WORKFLOW_COLUMNS = [
  { id: 'pending', title: 'En attente', color: 'bg-yellow-50 border-yellow-200', icon: ClockIcon },
  { id: 'diagnosis', title: 'Diagnostic', color: 'bg-purple-50 border-purple-200', icon: WrenchIcon },
  { id: 'waiting_parts', title: 'Attente pièces', color: 'bg-orange-50 border-orange-200', icon: ExclamationTriangleIcon },
  { id: 'in_progress', title: 'En cours', color: 'bg-blue-50 border-blue-200', icon: WrenchIcon },
  { id: 'testing', title: 'Test', color: 'bg-indigo-50 border-indigo-200', icon: CheckCircleIcon },
  { id: 'completed', title: 'Terminée', color: 'bg-green-50 border-green-200', icon: CheckCircleIcon },
  { id: 'delivered', title: 'Livrée', color: 'bg-emerald-50 border-emerald-200', icon: CheckCircleIcon }
];

const REPAIR_STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'diagnosis', label: 'Diagnostic', color: 'bg-purple-100 text-purple-800' },
  { value: 'waiting_parts', label: 'Attente pièces', color: 'bg-orange-100 text-orange-800' },
  { value: 'in_progress', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  { value: 'testing', label: 'Test', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'completed', label: 'Terminée', color: 'bg-green-100 text-green-800' },
  { value: 'delivered', label: 'Livrée', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'cancelled', label: 'Annulée', color: 'bg-red-100 text-red-800' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse', color: 'bg-gray-100 text-gray-800' },
  { value: 'normal', label: 'Normale', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'Haute', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800' }
];

const RepairsModule = () => {
  const navigate = useNavigate();
  
  // États principaux
  const [activeView, setActiveView] = useState('kanban');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [kanbanData, setKanbanData] = useState({
    pending: [],
    diagnosis: [],
    waiting_parts: [],
    in_progress: [],
    testing: [],
    completed: [],
    delivered: [],
    cancelled: []
  });
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [statistics, setStatistics] = useState(null);
  
  // États de filtrage
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  
  // États des modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // États du formulaire
  const [formData, setFormData] = useState({
    client: '',
    store: 'ville_avray',
    bike_brand: '',
    bike_model: '',
    bike_serial_number: '',
    bike_type: 'other',
    repair_type: 'repair',
    priority: 'normal',
    description: '',
    diagnosis: '',
    notes: '',
    estimated_cost: 0,
    max_budget: null,
    photos: []
  });
  
  // États pour la réception
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);

  // Charger les données
  const loadRepairs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeView === 'kanban') {
        const kanbanResult = await repairsAPI.getRepairsByStatus({
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          store: storeFilter !== 'all' ? storeFilter : undefined,
        });
        setKanbanData(kanbanResult);
      } else {
        const params = {
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          store: storeFilter !== 'all' ? storeFilter : undefined,
        };
        
        const result = await repairsAPI.getAll(params);
        const repairsData = result.data.results || result.data;
        setRepairs(repairsData);
      }
      
      // Charger les statistiques
      try {
        const statsResult = await repairsAPI.getStatistics();
        setStatistics(statsResult.data);
      } catch (statsErr) {
        console.warn('Could not load statistics:', statsErr);
      }
      
    } catch (err) {
      console.error('Error loading repairs:', err);
      setError(err.message || 'Erreur lors du chargement des réparations');
      toast.error('Erreur lors du chargement des réparations');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, priorityFilter, storeFilter, activeView]);

  // Charger les clients et produits pour la réception
  const loadClientsAndProducts = useCallback(async () => {
    try {
      const [clientsResult, productsResult] = await Promise.all([
        clientsAPI.getAll(),
        productsAPI.getAll()
      ]);
      setClients(clientsResult.data.results || clientsResult.data);
      setProducts(productsResult.data.results || productsResult.data);
    } catch (err) {
      console.error('Error loading clients/products:', err);
      toast.error('Erreur lors du chargement des données');
    }
  }, []);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  useEffect(() => {
    if (showCreateModal) {
      loadClientsAndProducts();
    }
  }, [showCreateModal, loadClientsAndProducts]);

  // Gestion du drag & drop corrigée
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination || source.droppableId === destination.droppableId) {
      return;
    }
    
    // Utiliser l'ID numérique pur
    const repairId = draggableId;
    const newStatus = destination.droppableId;
    
    try {
      await repairsAPI.updateStatus(repairId, { status: newStatus });
      
      const statusTitle = WORKFLOW_COLUMNS.find(c => c.id === newStatus)?.title || newStatus;
      toast.success(`Statut mis à jour: ${statusTitle}`);
      
      await loadRepairs();
      
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(`Erreur lors de la mise à jour: ${err.response?.data?.message || err.message}`);
      await loadRepairs();
    }
  };

  // 1. Enregistrement du vélo (réception)
  const handleCreateRepair = async (data) => {
    try {
      const repairData = {
        ...data,
        parts_needed: selectedParts.map(part => ({
          product: part.id,
          quantity: part.quantity || 1,
          unit_price: part.price
        }))
      };
      
      const response = await repairsAPI.create(repairData);
      
      // 4. Impression du reçu à la réception
      if (data.print_receipt) {
        await handlePrintTicket(response.data.id);
      }
      
      toast.success('Réparation créée avec succès');
      setShowCreateModal(false);
      setSelectedParts([]);
      loadRepairs();
      
    } catch (err) {
      console.error('Error creating repair:', err);
      toast.error('Erreur lors de la création de la réparation');
    }
  };

  // 3. Modification des informations du ticket
  const handleUpdateRepair = async (id, data) => {
    try {
      await repairsAPI.update(id, data);
      toast.success('Réparation mise à jour avec succès');
      setShowEditModal(false);
      loadRepairs();
    } catch (err) {
      console.error('Error updating repair:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // 4. Impression du ticket
  const handlePrintTicket = async (id) => {
    try {
      const response = await repairsAPI.printTicket(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket_reparation_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Ticket imprimé avec succès');
    } catch (err) {
      console.error('Error printing ticket:', err);
      toast.error('Erreur lors de l\'impression du ticket');
    }
  };

  // 5. Envoi du ticket à la caisse pour paiement
  const handleSendToCheckout = async (repair) => {
    try {
      const orderData = {
        client: repair.client?.id,
        store: repair.store,
        items: [
          {
            product: null,
            description: `Réparation - ${repair.description}`,
            quantity: 1,
            unit_price: parseFloat(repair.final_cost || repair.estimated_cost || 0),
            total_amount: parseFloat(repair.final_cost || repair.estimated_cost || 0)
          }
        ],
        notes: `Commande créée depuis la réparation ${repair.reference_number}`,
        source: 'repair',
        repair_id: repair.id
      };
      
      const orderResponse = await ordersAPI.create(orderData);
      
      toast.success('Ticket envoyé à la caisse avec succès');
      setShowCheckoutModal(false);
      
      navigate(`/cash-register?order_id=${orderResponse.data.id}`);
      
    } catch (err) {
      console.error('Error sending to checkout:', err);
      toast.error('Erreur lors de l\'envoi à la caisse');
    }
  };

  // Gestion des pièces pour la réception
  // eslint-disable-next-line no-unused-vars
  const handleAddPart = (product) => {
    const existingPart = selectedParts.find(p => p.id === product.id);
    if (existingPart) {
      setSelectedParts(selectedParts.map(p => 
        p.id === product.id 
          ? { ...p, quantity: (p.quantity || 1) + 1 }
          : p
      ));
    } else {
      setSelectedParts([...selectedParts, { ...product, quantity: 1 }]);
    }
  };

  const handleRemovePart = (productId) => {
    setSelectedParts(selectedParts.filter(p => p.id !== productId));
  };

  const handleUpdatePartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemovePart(productId);
    } else {
      setSelectedParts(selectedParts.map(p => 
        p.id === productId ? { ...p, quantity } : p
      ));
    }
  };

  // Calcul du total des pièces
  const partsTotal = selectedParts.reduce((total, part) => {
    return total + (parseFloat(part.price || 0) * (part.quantity || 1));
  }, 0);

  // Rendu de la vue Kanban avec drag & drop moderne
  const renderKanbanView = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} onRetry={loadRepairs} />;
    
    const hasData = Object.values(kanbanData).some(repairs => repairs.length > 0);
    if (!hasData) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucune réparation à afficher</p>
          <button
            onClick={loadRepairs}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Recharger les données
          </button>
        </div>
      );
    }
    
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {WORKFLOW_COLUMNS.map((column) => {
            const columnRepairs = kanbanData[column.id] || [];
            
            return (
              <div key={column.id} className={`rounded-lg border ${column.color} p-4`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <column.icon className="w-5 h-5" />
                    <h3 className="font-semibold">{column.title}</h3>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                    {columnRepairs.length}
                  </span>
                </div>
                
                <Droppable droppableId={column.id} direction="vertical">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] space-y-2 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 bg-opacity-30' : ''
                      }`}
                    >
                      {columnRepairs.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <p className="text-sm">Aucune réparation</p>
                        </div>
                      ) : (
                        columnRepairs.map((repair, index) => (
                          <Draggable 
                            key={repair.id.toString()} 
                            draggableId={repair.id.toString()} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer transition-all ${
                                  snapshot.isDragging 
                                    ? 'shadow-xl rotate-3 scale-105 border-blue-400' 
                                    : 'hover:shadow-md hover:border-gray-300'
                                }`}
                                onClick={() => {
                                  setSelectedRepair(repair);
                                  setShowDetailModal(true);
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{repair.reference_number}</p>
                                    <p className="text-xs text-gray-600">
                                      {repair.client?.name || repair.client?.first_name ? 
                                        `${repair.client?.name || repair.client?.first_name} ${repair.client?.last_name || ''}`.trim() : 
                                        'Client non spécifié'
                                      }
                                    </p>
                                  </div>
                                  {repair.priority !== 'normal' && (
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                      PRIORITY_OPTIONS.find(p => p.value === repair.priority)?.color
                                    }`}>
                                      {PRIORITY_OPTIONS.find(p => p.value === repair.priority)?.label}
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-xs text-gray-700 mb-2 line-clamp-2">
                                  {repair.description}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{repair.bike_brand}</span>
                                  <span>{new Date(repair.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                {repair.photo_1 && (
                                  <div className="mt-2">
                                    <PhotoIcon className="w-4 h-4 text-blue-500" />
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  // Rendu du modal de création (réception)
  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Réception du vélo - Nouvelle réparation
            </h3>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche - Formulaire */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  value={formData.client}
                  onChange={(e) => setFormData({...formData, client: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name} - {client.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Magasin *
                </label>
                <select
                  value={formData.store}
                  onChange={(e) => setFormData({...formData, store: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ville_avray">Ville d'Avray</option>
                  <option value="garches">Garches</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marque du vélo *
                  </label>
                  <input
                    type="text"
                    value={formData.bike_brand}
                    onChange={(e) => setFormData({...formData, bike_brand: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle
                  </label>
                  <input
                    type="text"
                    value={formData.bike_model}
                    onChange={(e) => setFormData({...formData, bike_model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description du problème *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorité
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PRIORITY_OPTIONS.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coût estimé (€)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.print_receipt || false}
                    onChange={(e) => setFormData({...formData, print_receipt: e.target.checked})}
                    className="mr-2"
                  />
                  Imprimer le ticket de réception
                </label>
              </div>
            </div>

            {/* Colonne droite - Pièces */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Pièces nécessaires</h4>
                
                {/* Liste des pièces sélectionnées */}
                {selectedParts.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">Pièces sélectionnées:</h5>
                    {selectedParts.map(part => (
                      <div key={part.id} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{part.name}</p>
                          <p className="text-xs text-gray-500">{part.price}€</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={part.quantity || 1}
                            onChange={(e) => handleUpdatePartQuantity(part.id, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                          <button
                            onClick={() => handleRemovePart(part.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <p className="text-sm font-medium">
                        Total pièces: {partsTotal.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notes supplémentaires..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Annuler
            </button>
            <button
              onClick={() => handleCreateRepair(formData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Créer la réparation
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Rendu du modal de détails avec actions complètes
  const renderDetailModal = () => {
    if (!showDetailModal || !selectedRepair) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Détails de la réparation {selectedRepair.reference_number}
            </h3>
            <button
              onClick={() => setShowDetailModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informations générales</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">Client:</span> {selectedRepair.client?.name}</p>
                  <p><span className="font-medium">Vélo:</span> {selectedRepair.bike_brand} {selectedRepair.bike_model}</p>
                  <p><span className="font-medium">Statut:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      REPAIR_STATUS_OPTIONS.find(s => s.value === selectedRepair.status)?.color
                    }`}>
                      {REPAIR_STATUS_OPTIONS.find(s => s.value === selectedRepair.status)?.label}
                    </span>
                  </p>
                  <p><span className="font-medium">Priorité:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      PRIORITY_OPTIONS.find(p => p.value === selectedRepair.priority)?.color
                    }`}>
                      {PRIORITY_OPTIONS.find(p => p.value === selectedRepair.priority)?.label}
                    </span>
                  </p>
                  <p><span className="font-medium">Coût:</span> {parseFloat(selectedRepair.final_cost || selectedRepair.estimated_cost || 0).toFixed(2)}€</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedRepair.description}</p>
                </div>
              </div>
              
              {selectedRepair.diagnosis && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Diagnostic</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedRepair.diagnosis}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Actions rapides</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowEditModal(true);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    <PencilIcon className="w-4 h-4 inline mr-1" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handlePrintTicket(selectedRepair.id)}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    <PrinterIcon className="w-4 h-4 inline mr-1" />
                    Imprimer
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowPartsModal(true);
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  >
                    <WrenchIcon className="w-4 h-4 inline mr-1" />
                    Pièces
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedRepair.id, 'delivered')}
                    disabled={selectedRepair.status === 'delivered'}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                    Livrer
                  </button>
                </div>
              </div>

              {/* 5. Envoi à la caisse */}
              {selectedRepair.status === 'completed' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Paiement</h4>
                  <button
                    onClick={() => handleSendToCheckout(selectedRepair)}
                    className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center justify-center"
                  >
                    <ShoppingCartIcon className="w-5 h-5 mr-2" />
                    Envoyer à la caisse
                  </button>
                </div>
              )}

              {/* Changement de statut */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Changer le statut</h4>
                <select
                  value={selectedRepair.status}
                  onChange={(e) => handleStatusChange(selectedRepair.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {REPAIR_STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modification du statut (alternative au drag & drop)
  const handleStatusChange = async (repairId, newStatus) => {
    try {
      await repairsAPI.updateStatus(repairId, { status: newStatus });
      
      const statusTitle = WORKFLOW_COLUMNS.find(c => c.id === newStatus)?.title || newStatus;
      toast.success(`Statut mis à jour: ${statusTitle}`);
      
      await loadRepairs();
      
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(`Erreur lors de la mise à jour: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Gestion des Réparations</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Réception vélo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et contrôles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les statuts</option>
              {REPAIR_STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les magasins</option>
              <option value="ville_avray">Ville d'Avray</option>
              <option value="garches">Garches</option>
            </select>
            
            <button
              onClick={loadRepairs}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="space-y-6">
          {activeView === 'kanban' && renderKanbanView()}
        </div>
      </div>

      {/* Modals */}
      {renderCreateModal()}
      {renderDetailModal()}
      
      {/* Modal pièces */}
      {showPartsModal && selectedRepair && (
        <RepairPartsManager
          repairId={selectedRepair.id}
          onClose={() => setShowPartsModal(false)}
        />
      )}
    </div>
  );
};

export default RepairsModule;
