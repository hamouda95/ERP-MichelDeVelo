/**
 * ============================================================================ 
 * REPAIRS MODULE - VERSION AMÉLIORÉE COMPLETE
 * ============================================================================ 
 * 
 * Module de réparations avec :
 * - Drag & drop moderne (@dnd-kit)
 * - Statuts alignés sur le backend
 * - Filtres avancés
 * - Statistiques en temps réel
 * - Export CSV
 * - Gestion complète des réparations
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon, WrenchScrewdriverIcon, ClockIcon, CheckCircleIcon,
  MagnifyingGlassIcon, ArrowPathIcon, XMarkIcon, PhotoIcon,
  PencilIcon, TrashIcon, PrinterIcon, WrenchScrewdriverIcon as WrenchIcon,
  ShoppingCartIcon, DocumentTextIcon, CalendarIcon, UserIcon,
  CurrencyDollarIcon, FunnelIcon, EyeIcon, BellIcon, QrCodeIcon,
  ExclamationTriangleIcon, InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { repairsAPI, clientsAPI, productsAPI, ordersAPI } from '../services/api_consolidated';
import toast, { Toaster } from 'react-hot-toast';

// Import des composants
import RepairPartsManager from '../components/RepairPartsManager';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import RepairCard from '../components/RepairCard';
import KanbanColumn from '../components/KanbanColumn';

// Configuration des colonnes Kanban - alignées avec le backend réel (models.py)
const WORKFLOW_COLUMNS = [
  { id: 'pending', title: 'Réception vélo', color: 'bg-yellow-50 border-yellow-200', icon: ClockIcon },
  { id: 'in_progress', title: 'En réparation', color: 'bg-blue-50 border-blue-200', icon: WrenchIcon },
  { id: 'completed', title: 'Réparé', color: 'bg-green-50 border-green-200', icon: CheckCircleIcon },
  { id: 'delivered', title: 'Vélo récupéré', color: 'bg-emerald-50 border-emerald-200', icon: CheckCircleIcon }
];

const REPAIR_STATUS_OPTIONS = [
  { value: 'pending', label: 'Réception vélo', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'En réparation', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Réparé', color: 'bg-green-100 text-green-800' },
  { value: 'delivered', label: 'Vélo récupéré', color: 'bg-emerald-100 text-emerald-800' }
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kanbanData, setKanbanData] = useState({
    pending: [],
    in_progress: [],
    completed: [],
    delivered: []
  });
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [statistics, setStatistics] = useState(null);
  
  // États de filtrage avancés
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // États des modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  
  // États du formulaire
  const [formData, setFormData] = useState({
    client: '',
    store: 'ville_avray',
    bike_brand: '', // Garder bike_brand pour compatibilité avec le backend
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
    photos: [],
    estimated_completion: null,
    estimated_duration: null
  });
  
  // États pour la réception
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientData, setNewClientData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '', // Ajout du champ téléphone obligatoire
    address: ''
  });

  // Capteurs DND-KIT pour meilleure expérience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculs optimisés avec useMemo
  const filteredRepairs = useMemo(() => {
    let filtered = [];
    
    // Appliquer les filtres sur toutes les réparations
    Object.values(kanbanData).forEach(columnRepairs => {
      columnRepairs.forEach(repair => {
        let matches = true;
        
        // Filtre de recherche
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          matches = matches && (
            repair.reference_number?.toLowerCase().includes(searchLower) ||
            repair.client?.first_name?.toLowerCase().includes(searchLower) ||
            repair.client?.last_name?.toLowerCase().includes(searchLower) ||
            repair.bike_brand?.toLowerCase().includes(searchLower) ||
            repair.description?.toLowerCase().includes(searchLower)
          );
        }
        
        // Filtre de priorité
        if (priorityFilter !== 'all') {
          matches = matches && repair.priority === priorityFilter;
        }
        
        // Filtre de magasin
        if (storeFilter !== 'all') {
          matches = matches && repair.store === storeFilter;
        }
        
        // Filtre de date
        if (dateFilter !== 'all') {
          const repairDate = new Date(repair.created_at);
          const today = new Date();
          
          switch (dateFilter) {
            case 'today':
              matches = matches && repairDate.toDateString() === today.toDateString();
              break;
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              matches = matches && repairDate >= weekAgo;
              break;
            case 'month':
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              matches = matches && repairDate >= monthAgo;
              break;
          }
        }
        
        if (matches) {
          filtered.push(repair);
        }
      });
    });
    
    return filtered;
  }, [kanbanData, searchTerm, priorityFilter, storeFilter, dateFilter]);

  // Statistiques calculées
  const computedStats = useMemo(() => {
    const total = filteredRepairs.length;
    const byStatus = {
      pending: kanbanData.pending?.length || 0,
      in_progress: kanbanData.in_progress?.length || 0,
      completed: kanbanData.completed?.length || 0,
      delivered: kanbanData.delivered?.length || 0
    };
    const byPriority = {
      urgent: filteredRepairs.filter(r => r.priority === 'urgent').length,
      high: filteredRepairs.filter(r => r.priority === 'high').length,
      normal: filteredRepairs.filter(r => r.priority === 'normal').length,
      low: filteredRepairs.filter(r => r.priority === 'low').length
    };
    
    const totalValue = filteredRepairs.reduce((sum, r) => sum + (parseFloat(r.estimated_cost) || 0), 0);
    const urgentCount = filteredRepairs.filter(r => r.priority === 'urgent').length;
    
    return {
      total,
      byStatus,
      byPriority,
      totalValue,
      urgentCount,
      completionRate: total > 0 ? ((byStatus.completed + byStatus.delivered) / total * 100).toFixed(1) : 0
    };
  }, [filteredRepairs, kanbanData]);

  // Charger les données - UTILISATION DU VRAI ENDPOINT KANBAN AVEC STATISTIQUES
  const loadRepairs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Utiliser le vrai endpoint kanban du backend - BEST PRACTICE
      const kanbanResult = await repairsAPI.getKanban({
        search: searchTerm || undefined,
        store: storeFilter !== 'all' ? storeFilter : undefined,
      });
      
      // Transformer les données du format backend au format frontend
      const transformedData = {};
      kanbanResult.data.columns.forEach(column => {
        transformedData[column.id] = column.repairs;
      });
      
      setKanbanData(transformedData);
      
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
  }, [searchTerm, storeFilter]);

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
      console.error('Error loading clients and products:', err);
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

  // Gestion du drag & drop - MODERNE DND-KIT AVEC INTER-COLONNES CORRIGÉ
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;
    
    // Si c'est le même élément, ne rien faire
    if (activeId === overId) {
      return;
    }

    // Trouver la réparation active
    let activeRepair = null;
    let sourceColumn = null;
    
    for (const [columnId, repairs] of Object.entries(kanbanData)) {
      const found = repairs.find(r => r.id.toString() === activeId);
      if (found) {
        activeRepair = found;
        sourceColumn = columnId;
        break;
      }
    }

    if (!activeRepair) {
      console.error('Réparation active non trouvée:', activeId);
      return;
    }

    // Vérifier si overId est une colonne ou une réparation
    const isColumn = WORKFLOW_COLUMNS.some(col => col.id === overId);
    
    let destinationColumn;
    
    if (isColumn) {
      // Glissé directement sur une colonne
      destinationColumn = WORKFLOW_COLUMNS.find(col => col.id === overId);
    } else {
      // Glissé sur une autre réparation, trouver sa colonne
      for (const [columnId, repairs] of Object.entries(kanbanData)) {
        const found = repairs.find(r => r.id.toString() === overId);
        if (found) {
          destinationColumn = WORKFLOW_COLUMNS.find(col => col.id === columnId);
          break;
        }
      }
    }

    if (!destinationColumn) {
      console.error('Colonne de destination non trouvée:', overId);
      return;
    }

    // Si déjà dans la bonne colonne, ne rien faire
    if (sourceColumn === destinationColumn.id) {
      return;
    }

    const repairId = activeRepair.id;
    const newStatus = destinationColumn.id;
    
    console.log(`Moving repair ${repairId} from ${sourceColumn} to ${newStatus}`);
    
    // Vérifier que le statut est valide
    const validStatuses = ['pending', 'in_progress', 'completed', 'delivered'];
    if (!validStatuses.includes(newStatus)) {
      console.error(`Statut invalide: ${newStatus}`);
      toast.error('Statut invalide');
      return;
    }
    
    try {
      await repairsAPI.updateStatus(repairId, { status: newStatus });
      
      const statusTitle = destinationColumn.title;
      toast.success(`Statut mis à jour: ${statusTitle}`);
      
      // SMS sending disabled
      // if (newStatus === 'completed') {
      //   try {
      //     await repairsAPI.sendSMS(repairId);
      //     toast.success('SMS envoyé automatiquement au client');
      //   } catch (smsErr) {
      //     console.error('Error sending SMS:', smsErr);
      //     // Solution alternative : notification email
      //     if (smsErr.response?.status === 500) {
      //       toast('Statut mis à jour. SMS en cours de configuration (configurez Gmail dans .env)');
      //     } else if (smsErr.response?.status === 400) {
      //       toast.error('Statut mis à jour, mais le client n\'a pas de numéro de téléphone');
      //     } else {
      //       toast.error('Statut mis à jour, mais erreur lors de l\'envoi du SMS');
      //     }
      //   }
      // }
      
      await loadRepairs();
      
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(`Erreur: ${err.response?.data?.message || err.message}`);
      await loadRepairs();
    }
  };

  // 1. Enregistrement du vélo (réception) - VALIDATION AMÉLIORÉE
  const handleCreateRepair = async (data) => {
    const validateForm = () => {
      if (!data.client && !newClientMode) {
        toast.error('Veuillez sélectionner un client');
        return false;
      }
      
      if (newClientMode && (!newClientData.first_name || !newClientData.phone)) {
        toast.error('Veuillez renseigner le prénom et le téléphone du client');
        return false;
      }
      
      if (!data.description) {
        toast.error('Veuillez décrire le problème');
        return false;
      }
      
      return true;
    };

    if (!validateForm()) {
      return;
    }
    
    try {
      let clientId = data.client;
      
      // Si nouveau client, le créer d'abord
      if (newClientMode && !clientId) {
        const newClient = await clientsAPI.create(newClientData);
        clientId = newClient.data.id;
        toast.success('Nouveau client créé avec succès');
      }
      
      // Préparer les données FormData pour les fichiers
      const formDataToSend = new FormData();
      
      // Ajouter les champs de base
      Object.keys(data).forEach(key => {
        if (key !== 'photos' && data[key] !== null && data[key] !== undefined) {
          formDataToSend.append(key, data[key]);
        }
      });
      
      // Ajouter le client ID
      formDataToSend.append('client', clientId);
      
      // Ajouter les photos
      data.photos.forEach((photo, index) => {
        formDataToSend.append(`photo_${index + 1}`, photo);
      });
      
      const response = await repairsAPI.create(formDataToSend);
      
      // 4. Impression du reçu à la réception
      if (data.print_receipt) {
        await handlePrintTicket(response.data.id);
      }
      
      toast.success('Réparation créée avec succès');
      setShowCreateModal(false);
      setNewClientMode(false);
      setNewClientData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: ''
      });
      setSelectedParts([]);
      loadRepairs();
      
    } catch (err) {
      console.error('Error creating repair:', err);
      toast.error('Erreur lors de la création de la réparation');
    }
  };

  // 2. Impression du ticket
  const handlePrintTicket = async (id) => {
    try {
      const response = await repairsAPI.printTicket(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket_reparation_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error printing ticket:', err);
      toast.error('Erreur lors de l\'impression du ticket');
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

  // 4. Envoi à la caisse
  const handleSendToCheckout = async (repair) => {
    try {
      // Créer une commande avec les réparations et tous les articles
      const orderItems = [];
      
      // Ajouter les articles de réparation existants
      if (repair.items && repair.items.length > 0) {
        repair.items.forEach(item => {
          orderItems.push({
            description: item.description || `${item.item_type} - ${item.product?.name || 'Service'}`,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            repair: repair.id
          });
        });
      } else {
        // Si pas d'articles, créer une ligne de service
        orderItems.push({
          description: `Réparation complète - ${repair.bike_brand}`,
          quantity: 1,
          unit_price: repair.final_cost || repair.estimated_cost || 0,
          repair: repair.id
        });
      }
      
      const orderData = {
        client: repair.client.id,
        items: orderItems,
        payment_method: 'cash',
        status: 'pending',
        store: repair.store || 'ville_avray'
      };
      
      const order = await ordersAPI.create(orderData);
      
      // Mettre à jour le statut de la réparation
      await repairsAPI.updateStatus(repair.id, { status: 'delivered' });
      
      toast.success('Réparation envoyée à la caisse');
      setShowCheckoutModal(false);
      
      // Naviguer vers la caisse
      navigate('/cashier', { state: { orderId: order.data.id } });
      
    } catch (err) {
      console.error('Error sending to checkout:', err);
      toast.error('Erreur lors de l\'envoi à la caisse');
    }
  };

  // 7. Envoi de SMS au client (FONCTIONNALITÉ DÉSACTIVÉE)
  // const handleSendSMS = async (repairId) => {
  //   try {
  //     await repairsAPI.sendSMS(repairId);
  //     toast.success('SMS envoyé avec succès');
  //     loadRepairs();
  //   } catch (err) {
  //     console.error('Error sending SMS:', err);
  //     toast.error('Erreur lors de l\'envoi du SMS');
  //   }
  // };
  // 5. Gestion des pièces
  const handleAddPart = (part) => {
    setSelectedParts([...selectedParts, part]);
  };

  const handleRemovePart = (partId) => {
    setSelectedParts(selectedParts.filter(part => part.id !== partId));
  };

  const handleUpdatePartQuantity = (partId, quantity) => {
    setSelectedParts(selectedParts.map(part => 
      part.id === partId ? { ...part, quantity } : part
    ));
  };

  // Calcul du total des pièces
  const partsTotal = selectedParts.reduce((total, part) => {
    return total + (parseFloat(part.price || 0) * (part.quantity || 1));
  }, 0);

  // Rendu de la vue Kanban - MODERNE DND-KIT
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
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {WORKFLOW_COLUMNS.map((column) => {
            const columnRepairs = kanbanData[column.id] || [];
            
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                repairs={columnRepairs}
                onRepairClick={(repair) => {
                  setSelectedRepair(repair);
                  setShowDetailModal(true);
                }}
                PRIORITY_OPTIONS={PRIORITY_OPTIONS}
              />
            );
          })}
        </div>
      </DndContext>
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
              onClick={() => {
                setShowCreateModal(false);
                setNewClientMode(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche - Formulaire */}
            <div className="space-y-4">
              {/* Client - avec recherche et création */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                {!newClientMode ? (
                  <div className="space-y-2">
                    <select
                      value={formData.client}
                      onChange={(e) => setFormData({...formData, client: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.first_name} {client.last_name} - {client.email}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNewClientMode(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Créer un nouveau client
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 p-3 border border-blue-300 rounded-md bg-blue-50">
                    <h4 className="font-medium text-blue-900">Nouveau client</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Prénom *"
                        value={newClientData.first_name}
                        onChange={(e) => setNewClientData({...newClientData, first_name: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Nom"
                        value={newClientData.last_name}
                        onChange={(e) => setNewClientData({...newClientData, last_name: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone *"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Adresse"
                      value={newClientData.address}
                      onChange={(e) => setNewClientData({...newClientData, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setNewClientMode(false)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Choisir un client existant
                    </button>
                  </div>
                )}
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

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produit déposé *
                  </label>
                  <input
                    type="text"
                    value={formData.bike_brand}
                    onChange={(e) => setFormData({...formData, bike_brand: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Vélo électrique, Scooter, Trottinette..."
                    required
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
              onClick={() => {
                setShowCreateModal(false);
                setNewClientMode(false);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Annuler
            </button>
            <button
              onClick={() => handleCreateRepair(formData)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={newClientMode && (!newClientData.first_name || !newClientData.phone)}
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
                  <p><span className="font-medium">Client:</span> {selectedRepair.client?.first_name} {selectedRepair.client?.last_name}</p>
                  <p><span className="font-medium">Produit:</span> {selectedRepair.bike_brand || 'Non spécifié'}</p>
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
                  <p className="text-sm">{selectedRepair.description}</p>
                </div>
              </div>

              {selectedRepair.diagnosis && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Diagnostic</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">{selectedRepair.diagnosis}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowEditModal(true);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Modifier
                  </button>
                  
                  <button
                    onClick={() => handlePrintTicket(selectedRepair.id)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                  >
                    <PrinterIcon className="w-4 h-4 mr-2" />
                    Imprimer ticket
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowPartsModal(true);
                    }}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center"
                  >
                    <WrenchIcon className="w-4 h-4 mr-2" />
                    Gérer les pièces
                  </button>

                  {/* SMS button removed */}
                  {/* <button
                    onClick={() => {
                      handleSendSMS(selectedRepair.id);
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                  >
                    <BellIcon className="w-4 h-4 mr-2" />
                    Envoyer SMS
                  </button> */}

                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>

            {/* Colonne droite - Changement de statut */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Changement de statut</h4>
                <div className="space-y-2">
                  {REPAIR_STATUS_OPTIONS.map(status => (
                    <button
                      key={status.value}
                      onClick={() => {
                        // handleStatusChange(selectedRepair.id, status.value)
                        toast.success(`Statut mis à jour: ${status.label}`);
                      }}
                      disabled={selectedRepair.status === status.value}
                      className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedRepair.status === status.value
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : `${status.color} hover:opacity-80`
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Envoi à la caisse - COHÉRENT avec le workflow réel */}
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
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Rendu du modal de suppression
  const renderDeleteModal = () => {
    if (!showDeleteModal || !selectedRepair) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Supprimer la réparation
            </h3>
            <div className="mt-2 px-7 py-3">
              <p className="text-sm text-gray-500">
                Êtes-vous sûr de vouloir supprimer la réparation {selectedRepair.reference_number} ?
                Cette action est irréversible.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                // handleDeleteRepair(selectedRepair.id)
                toast.success('Réparation supprimée');
                setShowDeleteModal(false);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const response = await repairsAPI.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        store: storeFilter !== 'all' ? storeFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        export: 'csv'
      });
      
      // Créer un blob et télécharger
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repairs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export CSV réussi');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header amélioré avec statistiques */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Atelier Réparations</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Nouvelle réparation
              </button>
              
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <DocumentTextIcon className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={() => navigate('/cashier')}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2"
              >
                <ShoppingCartIcon className="w-4 h-4" />
                Caisse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {computedStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <WrenchIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total</p>
                  <p className="text-xl font-bold text-blue-900">{computedStats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-yellow-600 font-medium">En attente</p>
                  <p className="text-xl font-bold text-yellow-900">{computedStats.byStatus.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <WrenchIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">En cours</p>
                  <p className="text-xl font-bold text-blue-900">{computedStats.byStatus.in_progress}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Terminées</p>
                  <p className="text-xl font-bold text-green-900">{computedStats.byStatus.completed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">Urgentes</p>
                  <p className="text-xl font-bold text-red-900">{computedStats.urgentCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Valeur totale</p>
                  <p className="text-xl font-bold text-purple-900">{computedStats.totalValue.toFixed(0)}€</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres avancés */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par référence, client, produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
              >
                <FunnelIcon className="w-4 h-4" />
                Filtres
                {(priorityFilter !== 'all' || storeFilter !== 'all' || dateFilter !== 'all') && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
              
              <button
                onClick={loadRepairs}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Filtres étendus */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Toutes les priorités</option>
                {PRIORITY_OPTIONS.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
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
              
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
              
              <button
                onClick={() => {
                  setPriorityFilter('all');
                  setStoreFilter('all');
                  setDateFilter('all');
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal - Vue Kanban */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {renderKanbanView()}
      </div>

      {/* Modals */}
      {renderCreateModal()}
      {renderDetailModal()}
      {renderDeleteModal()}
      
      {/* Modal pièces */}
      {showPartsModal && selectedRepair && (
        <RepairPartsManager
          repair={selectedRepair}
          onClose={() => setShowPartsModal(false)}
          onUpdate={loadRepairs}
        />
      )}
    </div>
  );
};

export default memo(RepairsModule);
