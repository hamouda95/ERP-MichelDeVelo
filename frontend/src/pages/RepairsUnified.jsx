/**
 * ============================================================================ 
 * COMPOSANT REPAIRS UNIFIED - INTERFACE UNIFIÉE DES RÉPARATIONS
 * ============================================================================ 
 * 
 * Interface complète unifiée pour gérer toutes les réparations :
 * - Workflow Kanban simplifié
 * - Accès direct aux tickets détaillés
 * - Gestion des pièces et interventions
 * - Création rapide de réparations
 * - Filtres et recherche avancés
 * - Statistiques en temps réel
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { repairsAPI } from '../services/api';
import RepairPartsManager from '../components/RepairPartsManager';
import QuickRepairForm from '../components/QuickRepairForm';
import toast from 'react-hot-toast';

// Colonnes du workflow unifié avec thème moderne
const WORKFLOW_COLUMNS = [
    { id: 'pending', title: 'Réception vélo', color: 'bg-yellow-50 border-yellow-200', icon: ClockIcon, badgeColor: 'badge-yellow' },
    { id: 'in_progress', title: 'En réparation', color: 'bg-purple-50 border-purple-200', icon: WrenchScrewdriverIcon, badgeColor: 'badge-purple' },
    { id: 'completed', title: 'Réparé - SMS envoyé', color: 'bg-green-50 border-green-200', icon: CheckCircleIcon, badgeColor: 'badge-green' },
    { id: 'delivered', title: 'Vélo récupéré', color: 'bg-emerald-50 border-emerald-200', icon: CheckCircleIcon, badgeColor: 'badge-emerald' }
];

const RepairsUnified = () => {
    const navigate = useNavigate();
    const [repairs, setRepairs] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [storeFilter, setStoreFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [showPartsModal, setShowPartsModal] = useState(false);
    const [showNewRepairModal, setShowNewRepairModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' ou 'list'
    
    // Statistiques
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        delivered: 0,
        totalValue: 0
    });

    // Charger les réparations
    useEffect(() => {
        loadRepairs();
        loadStats();
    }, []);

    // Recharger quand le mode change
    useEffect(() => {
        loadRepairs();
    }, [viewMode]);

    const loadRepairs = async () => {
        try {
            setLoading(true);
            
            // Utiliser l'endpoint Kanban pour le mode Kanban
            if (viewMode === 'kanban') {
                const response = await repairsAPI.getKanban();
                const kanbanData = response.data;
                
                // Organiser les données pour le frontend
                const organizedRepairs = {};
                kanbanData.columns.forEach(column => {
                    organizedRepairs[column.id] = column.repairs;
                });
                
                setRepairs(organizedRepairs);
                
                // Mettre à jour les stats si disponibles
                if (kanbanData.summary) {
                    setStats({
                        total: kanbanData.summary.total_repairs,
                        inProgress: kanbanData.summary.in_progress,
                        completed: kanbanData.summary.completed,
                        pending: kanbanData.summary.total_repairs - kanbanData.summary.in_progress - kanbanData.summary.completed
                    });
                }
            } else {
                // Mode liste - utiliser l'endpoint standard
                const response = await repairsAPI.getAll();
                
                // Simplifier la gestion des données API
                let repairsData = [];
                if (response?.data) {
                    repairsData = Array.isArray(response.data) ? response.data : response.data.results || [];
                } else if (response?.results) {
                    repairsData = Array.isArray(response.results) ? response.results : [];
                } else if (Array.isArray(response)) {
                    repairsData = response;
                }
                
                // Organiser par colonnes
                const organizedRepairs = {};
                WORKFLOW_COLUMNS.forEach(column => {
                    organizedRepairs[column.id] = [];
                });
                
                repairsData.forEach(repair => {
                    if (repair.status && organizedRepairs[repair.status]) {
                        organizedRepairs[repair.status].push(repair);
                    }
                });
                
                setRepairs(organizedRepairs);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des réparations:', error);
            toast.error('Erreur lors du chargement des réparations');
            // Initialiser avec des colonnes vides en cas d'erreur
            const emptyRepairs = {};
            WORKFLOW_COLUMNS.forEach(column => {
                emptyRepairs[column.id] = [];
            });
            setRepairs(emptyRepairs);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await repairsAPI.getStatistics();
            
            // Simplifier la gestion des stats
            let statsData = {};
            if (response?.data) {
                statsData = response.data;
            } else if (response && typeof response === 'object') {
                statsData = response;
            }
            
            setStats({
                total: statsData.total || statsData.total_repairs || 0,
                pending: statsData.pending || statsData.status_counts?.pending || 0,
                in_progress: statsData.in_progress || statsData.status_counts?.in_progress || 0,
                completed: statsData.completed || statsData.status_counts?.completed || 0,
                delivered: statsData.delivered || statsData.status_counts?.delivered || 0,
                totalValue: statsData.total_value || statsData.totalValue || 0
            });
        } catch (error) {
            console.warn('Statistiques non disponibles:', error.message);
            // Utiliser des valeurs par défaut sans afficher d'erreur à l'utilisateur
            setStats({
                total: 0,
                pending: 0,
                in_progress: 0,
                completed: 0,
                delivered: 0,
                totalValue: 0
            });
        }
    };

    // Filtrer les réparations
    const getFilteredRepairs = useCallback(() => {
        const filtered = {};
        
        WORKFLOW_COLUMNS.forEach(column => {
            filtered[column.id] = (repairs[column.id] || []).filter(repair => {
                // Filtre recherche avec vérification de propriétés
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch = 
                        (repair.reference_number && repair.reference_number.toLowerCase().includes(searchLower)) ||
                        (repair.bike_brand && repair.bike_brand.toLowerCase().includes(searchLower)) ||
                        (repair.bike_model && repair.bike_model.toLowerCase().includes(searchLower)) ||
                        (repair.client_details?.first_name && repair.client_details.first_name.toLowerCase().includes(searchLower)) ||
                        (repair.client_details?.last_name && repair.client_details.last_name.toLowerCase().includes(searchLower));
                    
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

    // Carte de réparation modernisée avec animations et accessibilité
    const RepairCardStatic = ({ repair }) => {
        const getStoreColor = (store) => {
            const colors = {
                ville_avray: 'badge-purple',
                garches: 'badge-green'
            };
            return colors[store] || 'badge-gray';
        };

        // Vérifications de sécurité pour éviter les erreurs
        if (!repair) return null;

        return (
            <div className="card card-hover bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-3 cursor-pointer animate-fade-in transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => navigate(`/repair-ticket/${repair.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/repair-ticket/${repair.id}`);
                    }
                }}
                aria-label={`Réparation ${repair.reference_number || 'N/A'} - ${repair.bike_brand || ''} ${repair.bike_model || ''}`}
            >
                {/* En-tête avec badges */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            {repair.reference_number}
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {new Date(repair.created_at).toLocaleDateString('fr-FR', { 
                                    day: 'numeric', 
                                    month: 'short' 
                                })}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1">
                        <span className={`${getPriorityColor(repair.priority)} text-xs font-semibold`}>
                            {repair.priority === 'urgent' ? '🚨' : repair.priority === 'high' ? '⚡' : ''}
                            {repair.priority}
                        </span>
                        <span className={`${getStoreColor(repair.store)} text-xs font-semibold`}>
                            {repair.store === 'ville_avray' ? '📍 VA' : '📍 GA'}
                        </span>
                    </div>
                </div>

                {/* Informations vélo */}
                <div className="mb-3">
                    <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                        🚴 {repair.bike_brand}
                        {repair.bike_model && (
                            <span className="text-gray-500 text-xs">- {repair.bike_model}</span>
                        )}
                    </div>
                </div>

                {/* Informations client */}
                <div className="mb-3">
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                        👤 {repair.client_details?.first_name} {repair.client_details?.last_name}
                    </div>
                    {repair.client_details?.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            📞 {repair.client_details.phone}
                        </div>
                    )}
                </div>

                {/* Description */}
                {repair.description && (
                    <div className="mb-3">
                        <div className="text-xs text-gray-700 line-clamp-2 bg-gray-50 p-2 rounded-lg">
                            📝 {repair.description}
                        </div>
                    </div>
                )}

                {/* Coûts */}
                <div className="flex justify-between items-center text-xs border-t pt-2">
                    <div className="text-gray-500 flex items-center gap-1">
                        💰 Estimé: <span className="font-semibold text-blue-600">{repair.estimated_cost}€</span>
                    </div>
                    {repair.final_cost > 0 && (
                        <div className="font-semibold text-green-600 flex items-center gap-1">
                            ✅ Final: {repair.final_cost}€
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Colonne du workflow modernisée avec animations et responsive design
    const WorkflowColumnStatic = ({ column }) => {
        const filteredRepairs = getFilteredRepairs();
        const columnRepairs = filteredRepairs[column.id] || [];
        const Icon = column.icon;

        return (
            <div className={`${column.color} rounded-xl border-2 p-4 h-full flex flex-col animate-fade-in transform transition-all duration-300 hover:shadow-lg`}>
                {/* En-tête moderne */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg shadow-md">
                            <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-base">{column.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="badge-primary text-xs font-semibold">
                                    {columnRepairs.length} réparation{columnRepairs.length > 1 ? 's' : ''}
                                </span>
                                {columnRepairs.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                        ~{Math.round(columnRepairs.reduce((sum, r) => sum + (r.estimated_cost || 0), 0))}€
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste des réparations avec scroll optimisé */}
                <div
                    className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-custom"
                    style={{ 
                        minHeight: '200px',
                        maxHeight: 'calc(100vh - 300px)'
                    }}
                >
                    {columnRepairs.map((repair, index) => (
                        <div 
                            key={repair.id} 
                            className="animate-slide-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <RepairCardStatic repair={repair} />
                        </div>
                    ))}
                    
                    {columnRepairs.length === 0 && (
                        <div className="text-center py-12 animate-fade-in">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="text-gray-400 text-sm font-medium">
                                Aucune réparation dans cette colonne
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                                Les réparations apparaîtront ici automatiquement
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: 'bg-gray-100 text-gray-700',
            normal: 'bg-blue-100 text-blue-700',
            high: 'bg-orange-100 text-orange-700',
            urgent: 'bg-red-100 text-red-700'
        };
        return colors[priority] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Chargement des réparations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header moderne avec animations */}
            <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-4 lg:px-6 lg:py-5 animate-slide-down">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="animate-slide-up">
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 text-shadow flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            Atelier - Gestion Unifiée
                        </h1>
                        <p className="text-sm text-gray-600 mt-2 ml-14">Toutes les réparations en une seule interface</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 animate-fade-in">
                        {/* Statistiques modernisées */}
                        <button
                            onClick={() => setShowStatsModal(true)}
                            className="btn-secondary flex items-center gap-2 group"
                        >
                            <ChartBarIcon className="h-4 w-4 group-hover:animate-pulse" />
                            <span>Stats ({stats.total})</span>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </button>

                        {/* Changement de vue moderne */}
                        <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                                    viewMode === 'kanban' 
                                        ? 'bg-white shadow-sm text-blue-600 font-medium' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                                aria-label="Vue Kanban"
                            >
                                📋 Kanban
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                                    viewMode === 'list' 
                                        ? 'bg-white shadow-sm text-blue-600 font-medium' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                                aria-label="Vue Liste"
                            >
                                📝 Liste
                            </button>
                        </div>
                        
                        <button
                            onClick={() => setShowNewRepairModal(true)}
                            className="btn-primary flex items-center gap-2 shadow-medium hover:shadow-strong transform transition-all duration-200 hover:scale-[1.02]"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>Nouvelle réparation</span>
                        </button>
                    </div>
                </div>

                {/* Filtres modernisés */}
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 animate-fade-in">
                    <div className="flex-1 w-full sm:w-auto">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="🔍 Rechercher une réparation, vélo, client..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input pl-10 pr-4 py-3 text-sm w-full"
                                aria-label="Rechercher une réparation"
                            />
                        </div>
                    </div>
                    
                    <select
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        className="form-input px-4 py-3 text-sm"
                        aria-label="Filtrer par magasin"
                    >
                        <option value="all">🏪 Tous les magasins</option>
                        <option value="ville_avray">📍 Ville d'Avray</option>
                        <option value="garches">📍 Garches</option>
                    </select>
                    
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="form-input px-4 py-3 text-sm"
                        aria-label="Filtrer par priorité"
                    >
                        <option value="all">⚡ Toutes les priorités</option>
                        <option value="low">😌 Basse</option>
                        <option value="normal">👍 Normale</option>
                        <option value="high">⚡ Haute</option>
                        <option value="urgent">🚨 Urgente</option>
                    </select>
                </div>
            </div>

            {/* Contenu principal - Kanban moderne avec animations */}
            <div className="flex-1 overflow-hidden">
                <style>{`
                    .scrollbar-custom::-webkit-scrollbar { 
                        width: 6px; 
                        height: 6px;
                    }
                    .scrollbar-custom::-webkit-scrollbar-track { 
                        background: #f1f5f9; 
                        border-radius: 3px;
                    }
                    .scrollbar-custom::-webkit-scrollbar-thumb { 
                        background: #cbd5e1; 
                        border-radius: 3px;
                    }
                    .scrollbar-custom::-webkit-scrollbar-thumb:hover { 
                        background: #94a3b8; 
                    }
                    .scrollbar-custom { 
                        scrollbar-width: thin;
                        scrollbar-color: #cbd5e1 #f1f5f9;
                    }
                `}</style>
                <div className="flex space-x-3 h-full p-4 overflow-hidden animate-fade-in">
                    {WORKFLOW_COLUMNS.map((column, index) => (
                        <div 
                            key={`column-${column.id}-${index}`} 
                            className="flex-1 min-w-0 h-full"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <WorkflowColumnStatic column={column} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal des statistiques modernisée */}
            {showStatsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="card bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 transform transition-all duration-300 scale-100 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <ChartBarIcon className="h-6 w-6 text-blue-600" />
                                Statistiques de l'atelier
                            </h3>
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                aria-label="Fermer"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="card bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-sm text-blue-700 mt-1">Total réparations</div>
                            </div>
                            <div className="card bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                <div className="text-sm text-yellow-700 mt-1">En attente</div>
                            </div>
                            <div className="card bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
                                <div className="text-sm text-purple-700 mt-1">En réparation</div>
                            </div>
                            <div className="card bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                                <div className="text-sm text-green-700 mt-1">Réparées</div>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">Vélos récupérés</span>
                                <span className="text-2xl font-bold text-emerald-600">{stats.delivered}</span>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">Valeur totale estimée</span>
                                <span className="text-2xl font-bold text-blue-600">{stats.totalValue}€</span>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="btn-primary flex-1"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    setShowStatsModal(false);
                                    loadStats();
                                }}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nouvelle réparation */}
            {showNewRepairModal && (
                <QuickRepairForm
                    onClose={() => setShowNewRepairModal(false)}
                    onSuccess={() => {
                        setShowNewRepairModal(false);
                        loadRepairs();
                        loadStats();
                        toast.success('✅ Réparation créée avec succès');
                    }}
                />
            )}

            {/* Modal gestion des pièces */}
            {showPartsModal && selectedRepair && (
                <RepairPartsManager
                    repair={selectedRepair}
                    onClose={() => {
                        setShowPartsModal(false);
                        setSelectedRepair(null);
                    }}
                    onSuccess={() => {
                        setShowPartsModal(false);
                        setSelectedRepair(null);
                        loadRepairs();
                        toast.success('✅ Pièces mises à jour');
                    }}
                />
            )}
        </div>
    );
};

export default RepairsUnified;
