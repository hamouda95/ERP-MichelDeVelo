/**
 * ============================================================================ 
 * COMPOSANT REPAIR PARTS MANAGER - GESTION DES PIÈCES
 * ============================================================================ 
 * 
 * Interface moderne pour la gestion des pièces de réparation :
 * - Ajout/suppression de pièces et interventions
 * - Calcul automatique des coûts
 * - Liaison avec les produits du stock
 * - Suivi des commandes de pièces
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect } from 'react';
import { 
    PlusIcon, 
    XMarkIcon,
    CurrencyDollarIcon,
    CubeIcon,
    WrenchScrewdriverIcon,
    ClockIcon,
    CheckCircleIcon,
    TruckIcon
} from '@heroicons/react/24/outline';
import { repairsAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';

const RepairPartsManager = ({ repair, onClose, onUpdate }) => {
    const [parts, setParts] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    
    // Formulaire d'ajout
    const [newPart, setNewPart] = useState({
        item_type: 'part',
        product: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        ordered: false,
        received: false
    });

    // Charger les pièces existantes et les produits
    useEffect(() => {
        if (repair?.id) {
            // Utiliser les pièces déjà chargées depuis la réparation
            if (repair.items && repair.items.length > 0) {
                setParts(repair.items);
            } else {
                // Essayer de charger via l'API si aucune pièce n'est incluse
                loadParts();
            }
            loadProducts();
        }
    }, [repair?.id]);

    const loadParts = async () => {
        try {
            const response = await repairsAPI.getItems(repair.id);
            setParts(response.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des pièces:', error);
            // Ne pas afficher d'erreur si les pièces sont déjà dans la réparation
            if (!repair.items || repair.items.length === 0) {
                toast.error('Erreur lors du chargement des pièces');
            }
        }
    };

    const loadProducts = async () => {
        try {
            const response = await productsAPI.getAll();
            setProducts(response.data.results || response.data);
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
        }
    };

    // Ajouter une pièce/intervention
    const handleAddPart = async () => {
        try {
            setLoading(true);
            const partData = {
                ...newPart,
                repair: repair.id,
                total_price: newPart.quantity * newPart.unit_price
            };
            
            await repairsAPI.addItem(repair.id, partData);
            toast.success('Pièce/intervention ajoutée');
            
            // Réinitialiser le formulaire
            setNewPart({
                item_type: 'part',
                product: '',
                description: '',
                quantity: 1,
                unit_price: 0,
                ordered: false,
                received: false
            });
            setSelectedProduct(null);
            setShowAddForm(false);
            
            // Recharger les pièces
            loadParts();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Erreur lors de l\'ajout de la pièce');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Supprimer une pièce
    const handleDeletePart = async (partId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette pièce/intervention ?')) {
            return;
        }
        
        try {
            await repairsAPI.deleteItem(partId);
            toast.success('Pièce/intervention supprimée');
            loadParts();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    // Marquer une pièce comme commandée/reçue
    const handleUpdatePartStatus = async (partId, action) => {
        try {
            if (action === 'ordered') {
                await repairsAPI.markPieceOrdered(partId);
                toast.success('Pièce marquée comme commandée');
            } else if (action === 'received') {
                await repairsAPI.markPieceReceived(partId);
                toast.success('Pièce marquée comme reçue');
            }
            loadParts();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    // Calculer les totaux
    const calculateTotals = () => {
        if (!parts || !Array.isArray(parts)) {
            return { partsCost: 0, laborCost: 0, serviceCost: 0, totalCost: 0 };
        }
        
        const partsCost = parts.filter(p => p.item_type === 'part').reduce((sum, part) => sum + (parseFloat(part.total_price) || 0), 0);
        const laborCost = parts.filter(p => p.item_type === 'labor').reduce((sum, part) => sum + (parseFloat(part.total_price) || 0), 0);
        const serviceCost = parts.filter(p => p.item_type === 'service').reduce((sum, part) => sum + (parseFloat(part.total_price) || 0), 0);
        const totalCost = partsCost + laborCost + serviceCost;
        
        return { partsCost, laborCost, serviceCost, totalCost };
    };

    const totals = calculateTotals();

    // Types d'articles
    const itemTypes = [
        { value: 'part', label: 'Pièce', icon: CubeIcon },
        { value: 'labor', label: 'Main d\'œuvre', icon: WrenchScrewdriverIcon },
        { value: 'service', label: 'Service', icon: WrenchScrewdriverIcon },
        { value: 'other', label: 'Autre', icon: CubeIcon }
    ];

    // Obtenir l'icône pour un type
    const getTypeIcon = (type) => {
        const itemType = itemTypes.find(t => t.value === type);
        const Icon = itemType?.icon || CubeIcon;
        return <Icon className="h-4 w-4" />;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Gestion des pièces - {repair.reference_number}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {repair.bike_brand} {repair.bike_model}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col h-[70vh]">
                    {/* Résumé des coûts */}
                    <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-blue-600 font-semibold">
                                    {totals.partsCost.toFixed(2)}€
                                </div>
                                <div className="text-blue-700">Pièces</div>
                            </div>
                            <div className="text-center">
                                <div className="text-purple-600 font-semibold">
                                    {totals.laborCost.toFixed(2)}€
                                </div>
                                <div className="text-purple-700">Main d'œuvre</div>
                            </div>
                            <div className="text-center">
                                <div className="text-indigo-600 font-semibold">
                                    {totals.serviceCost.toFixed(2)}€
                                </div>
                                <div className="text-indigo-700">Services</div>
                            </div>
                            <div className="text-center">
                                <div className="text-green-600 font-bold text-lg">
                                    {totals.totalCost.toFixed(2)}€
                                </div>
                                <div className="text-green-700">Total</div>
                            </div>
                        </div>
                    </div>

                    {/* Liste des pièces */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Pièces et interventions</h3>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <PlusIcon className="h-4 w-4 mr-2" />
                                Ajouter
                            </button>
                        </div>

                        {parts.length === 0 ? (
                            <div className="text-center py-8">
                                <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">Aucune pièce ou intervention ajoutée</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {parts.map((part) => (
                                    <div key={part.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    {getTypeIcon(part.item_type)}
                                                    <span className="font-medium text-gray-900">
                                                        {part.description}
                                                    </span>
                                                    {part.product && (
                                                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                            Stock
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                    <span>Qté: {part.quantity}</span>
                                                    <span>Prix unitaire: {part.unit_price}€</span>
                                                    <span className="font-semibold text-gray-900">
                                                        Total: {part.total_price}€
                                                    </span>
                                                </div>

                                                {/* Statut de commande */}
                                                {part.item_type === 'part' && (
                                                    <div className="flex items-center space-x-2 mt-2">
                                                        {part.ordered ? (
                                                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                <TruckIcon className="h-3 w-3 mr-1" />
                                                                Commandée
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUpdatePartStatus(part.id, 'ordered')}
                                                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <TruckIcon className="h-3 w-3 mr-1" />
                                                                Commander
                                                            </button>
                                                        )}
                                                        
                                                        {part.received ? (
                                                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                                                Reçue
                                                            </span>
                                                        ) : part.ordered && (
                                                            <button
                                                                onClick={() => handleUpdatePartStatus(part.id, 'received')}
                                                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                                                Réceptionner
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <button
                                                onClick={() => handleDeletePart(part.id)}
                                                className="ml-4 text-red-600 hover:text-red-800"
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Formulaire d'ajout */}
                {showAddForm && (
                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex-shrink-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter une pièce/intervention</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Type d'article */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={newPart.item_type}
                                    onChange={(e) => setNewPart({...newPart, item_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {itemTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Produit (si type = pièce) */}
                            {newPart.item_type === 'part' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Produit (optionnel)</label>
                                    <select
                                        value={newPart.product}
                                        onChange={(e) => {
                                            const product = products.find(p => p.id == e.target.value);
                                            setSelectedProduct(product);
                                            setNewPart({...newPart, product: e.target.value});
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Sélectionner un produit</option>
                                        {products.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} - {product.price}€
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Description */}
                            <div className={newPart.item_type === 'part' && selectedProduct ? 'col-span-2' : 'col-span-2'}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={newPart.description}
                                    onChange={(e) => setNewPart({...newPart, description: e.target.value})}
                                    placeholder={selectedProduct ? selectedProduct.name : "Description de la pièce/intervention"}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Quantité */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={newPart.quantity}
                                    onChange={(e) => setNewPart({...newPart, quantity: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Prix unitaire */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newPart.unit_price}
                                    onChange={(e) => setNewPart({...newPart, unit_price: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setSelectedProduct(null);
                                    setNewPart({
                                        item_type: 'part',
                                        product: '',
                                        description: '',
                                        quantity: 1,
                                        unit_price: 0,
                                        ordered: false,
                                        received: false
                                    });
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddPart}
                                disabled={loading || !newPart.description}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Ajout...' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RepairPartsManager;
