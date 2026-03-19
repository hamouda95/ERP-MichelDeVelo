/**
 * ============================================================================ 
 * COMPOSANT REPAIRS KANBAN - WORKFLOW VISUEL MODERNE
 * ============================================================================ 
 * 
 * Interface de gestion des réparations avec workflow en colonnes :
 * - Glisser-déposer des vélos entre les statuts
 * - Vue en colonnes type Kanban (3+ colonnes)
 * - Gestion des pièces et interventions
 * - Interface moderne et intuitive
 * - Mise à jour en temps réel
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    WrenchScrewdriverIcon, 
    ClockIcon, 
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    CameraIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    UserIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { repairsAPI } from '../services/api';
import RepairPartsManager from '../components/RepairPartsManager';
import QuickRepairForm from '../components/QuickRepairForm';
import toast from 'react-hot-toast';

// Colonnes du workflow simplifié
const WORKFLOW_COLUMNS = [
    { id: 'pending', title: 'Réception vélo', color: 'bg-yellow-50 border-yellow-200', icon: ClockIcon },
    { id: 'in_progress', title: 'En réparation', color: 'bg-purple-50 border-purple-200', icon: WrenchScrewdriverIcon },
    { id: 'completed', title: 'Réparé - SMS envoyé', color: 'bg-green-50 border-green-200', icon: CheckCircleIcon },
    { id: 'delivered', title: 'Vélo récupéré', color: 'bg-emerald-50 border-emerald-200', icon: CheckCircleIcon }
];

const RepairsKanban = () => {
    const [repairs, setRepairs] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [storeFilter, setStoreFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [showPartsModal, setShowPartsModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showNewRepairModal, setShowNewRepairModal] = useState(false);

    // Charger les réparations
    useEffect(() => {
        loadRepairs();
    }, []);

    const loadRepairs = async () => {
        try {
            setLoading(true);
            const response = await repairsAPI.getAll();
            const repairsData = response.data.results || response.data;
            
            // Organiser par colonnes simplifiées
            const organizedRepairs = {};
            WORKFLOW_COLUMNS.forEach(column => {
                organizedRepairs[column.id] = [];
            });
            
            repairsData.forEach(repair => {
                if (organizedRepairs[repair.status]) {
                    organizedRepairs[repair.status].push(repair);
                }
            });
            
            setRepairs(organizedRepairs);
        } catch (error) {
            toast.error('Erreur lors du chargement des réparations');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les réparations
    const getFilteredRepairs = useCallback(() => {
        const filtered = {};
        
        WORKFLOW_COLUMNS.forEach(column => {
            filtered[column.id] = (repairs[column.id] || []).filter(repair => {
                // Filtre recherche
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch = 
                        repair.reference_number.toLowerCase().includes(searchLower) ||
                        repair.bike_brand.toLowerCase().includes(searchLower) ||
                        repair.bike_model.toLowerCase().includes(searchLower) ||
                        repair.client_details?.first_name?.toLowerCase().includes(searchLower) ||
                        repair.client_details?.last_name?.toLowerCase().includes(searchLower);
                    
                    if (!matchesSearch) return false;
                }
                
                // Filtre magasin
                if (storeFilter !== 'all' && repair.store !== storeFilter) {
                    return false;
                }
                
                // Filtre priorité
                if (priorityFilter !== 'all' && repair.priority !== priorityFilter) {
                    return false;
                }
                
                return true;
            });
        });
        
        return filtered;
    }, [repairs, searchTerm, storeFilter, priorityFilter]);

    // Gérer le glisser-déposer
    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        
        // Si pas de destination valide
        if (!destination) return;
        
        // Si pas de déplacement
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }
        
        // Mettre à jour l'état local immédiatement pour l'UX
        const newRepairs = { ...repairs };
        const repair = repairs[source.droppableId][source.index];
        
        // Retirer de la source
        newRepairs[source.droppableId] = [...newRepairs[source.droppableId]];
        newRepairs[source.droppableId].splice(source.index, 1);
        
        // Ajouter à la destination
        newRepairs[destination.droppableId] = [...newRepairs[destination.droppableId]];
        newRepairs[destination.droppableId].splice(destination.index, 0, repair);
        
        setRepairs(newRepairs);
        
        // Mettre à jour le statut en base
        try {
            await repairsAPI.updateStatus(repair.id, { 
                status: destination.droppableId,
                notes: `Déplacement de "${source.droppableId}" vers "${destination.droppableId}" via le workflow`
            });
            
            toast.success(`Réparation ${repair.reference_number} déplacée vers ${WORKFLOW_COLUMNS.find(c => c.id === destination.droppableId)?.title}`);
        } catch (error) {
            toast.error('Erreur lors de la mise à jour du statut');
            // Revenir à l'état précédent en cas d'erreur
            setRepairs(repairs);
        }
    };

    // Carte de réparation
    const RepairCard = ({ repair, index }) => {
        const getPriorityColor = (priority) => {
            const colors = {
                low: 'bg-gray-100 text-gray-700',
                normal: 'bg-blue-100 text-blue-700',
                high: 'bg-orange-100 text-orange-700',
                urgent: 'bg-red-100 text-red-700'
            };
            return colors[priority] || 'bg-gray-100 text-gray-700';
        };

        const getStoreColor = (store) => {
            const colors = {
                ville_avray: 'bg-purple-100 text-purple-700',
                garches: 'bg-green-100 text-green-700'
            };
            return colors[store] || 'bg-gray-100 text-gray-700';
        };

        return (
            <Draggable draggableId={repair.id.toString()} index={index}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 cursor-move transition-all ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'hover:shadow-md'
                        }`}
                    >
                        {/* En-tête de la carte */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-sm">
                                    {repair.reference_number}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {new Date(repair.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex space-x-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(repair.priority)}`}>
                                    {repair.priority}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStoreColor(repair.store)}`}>
                                    {repair.store === 'ville_avray' ? 'VA' : 'GA'}
                                </span>
                            </div>
                        </div>

                        {/* Informations vélo */}
                        <div className="mb-3">
                            <div className="font-medium text-gray-900 text-sm">
                                {repair.bike_brand}
                            </div>
                            {repair.bike_model && (
                                <div className="text-xs text-gray-500">
                                    {repair.bike_model}
                                </div>
                            )}
                        </div>

                        {/* Informations client */}
                        <div className="mb-3">
                            <div className="text-xs text-gray-600">
                                👤 {repair.client_details?.first_name} {repair.client_details?.last_name}
                            </div>
                            {repair.client_details?.phone && (
                                <div className="text-xs text-gray-500">
                                    📞 {repair.client_details.phone}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {repair.description && (
                            <div className="mb-3">
                                <div className="text-xs text-gray-700 line-clamp-2">
                                    {repair.description}
                                </div>
                            </div>
                        )}

                        {/* Coûts */}
                        <div className="flex justify-between items-center text-xs">
                            <div className="text-gray-500">
                                💰 Estimé: {repair.estimated_cost}€
                            </div>
                            {repair.final_cost > 0 && (
                                <div className="font-semibold text-green-600">
                                    Final: {repair.final_cost}€
                                </div>
                            )}
                        </div>

                        {/* Actions rapides */}
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                            <button
                                onClick={() => {
                                    setSelectedRepair(repair);
                                    setShowDetailsModal(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Détails
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedRepair(repair);
                                    setShowPartsModal(true);
                                }}
                                className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                                Pièces
                            </button>
                        </div>

                        {/* Photos */}
                        {repair.photo_1_url && (
                            <div className="mt-3 flex space-x-2">
                                <img 
                                    src={repair.photo_1_url} 
                                    alt="Photo vélo" 
                                    className="w-12 h-12 object-cover rounded border border-gray-200"
                                />
                            </div>
                        )}
                    </div>
                )}
            </Draggable>
        );
    };

    // Colonne du workflow
    const WorkflowColumn = ({ column }) => {
        const filteredRepairs = getFilteredRepairs();
        const columnRepairs = filteredRepairs[column.id] || [];
        const Icon = column.icon;

        return (
            <div className={`${column.color} rounded-lg border-2 p-4 min-h-[600px]`}>
                {/* En-tête de la colonne */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">{column.title}</h3>
                        <span className="bg-white px-2 py-1 text-xs font-semibold rounded-full text-gray-600">
                            {columnRepairs.length}
                        </span>
                    </div>
                </div>

                {/* Liste des réparations */}
                <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[500px] transition-colors ${
                                snapshot.isDraggingOver ? 'bg-white bg-opacity-50' : ''
                            }`}
                        >
                            {columnRepairs.map((repair, index) => (
                                <RepairCard key={repair.id} repair={repair} index={index} />
                            ))}
                            {provided.placeholder}
                            
                            {/* Message si vide */}
                            {columnRepairs.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="text-gray-400 text-sm">
                                        Aucune réparation dans cette colonne
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Droppable>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Atelier - Workflow Réparations</h1>
                        <p className="text-sm text-gray-600 mt-1">Glissez les vélos d'un statut à l'autre</p>
                    </div>
                    
                    <button
                        onClick={() => setShowNewRepairModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Nouvelle réparation
                    </button>
                </div>

                {/* Filtres */}
                <div className="mt-4 flex items-center space-x-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher une réparation..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <select
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Tous les magasins</option>
                        <option value="ville_avray">Ville d'Avray</option>
                        <option value="garches">Garches</option>
                    </select>
                    
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Toutes les priorités</option>
                        <option value="low">Basse</option>
                        <option value="normal">Normale</option>
                        <option value="high">Haute</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>
            </div>

            {/* Workflow Kanban */}
            <div className="flex-1 overflow-x-auto p-6">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex space-x-4 min-w-max">
                        {WORKFLOW_COLUMNS.map(column => (
                            <div key={column.id} className="w-80 flex-shrink-0">
                                <WorkflowColumn column={column} />
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </div>

            {/* Modal des détails */}
            {showDetailsModal && selectedRepair && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {selectedRepair.reference_number}
                                </h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Informations vélo</h3>
                                    <p className="text-gray-700">{selectedRepair.bike_brand} {selectedRepair.bike_model}</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Client</h3>
                                    <p className="text-gray-700">
                                        {selectedRepair.client_details?.first_name} {selectedRepair.client_details?.last_name}
                                    </p>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                    <p className="text-gray-700">{selectedRepair.description}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal des pièces */}
            {showPartsModal && selectedRepair && (
                <RepairPartsManager 
                    repair={selectedRepair} 
                    onClose={() => setShowPartsModal(false)}
                    onUpdate={loadRepairs}
                />
            )}

            {/* Modal nouvelle réparation */}
            {showNewRepairModal && (
                <QuickRepairForm 
                    onClose={() => setShowNewRepairModal(false)}
                    onSuccess={loadRepairs}
                />
            )}
        </div>
    );
};

export default RepairsKanban;
