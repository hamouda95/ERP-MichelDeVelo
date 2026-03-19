/**
 * ============================================================================ 
 * COMPOSANT QUICK REPAIR FORM - FORMULAIRE RAPIDE DE RÉPARATION
 * ============================================================================ 
 * 
 * Formulaire simplifié pour créer rapidement une nouvelle réparation
 * directement depuis l'interface Kanban :
 * - Champs essentiels uniquement
 * - Upload de photos
 * - Validation en temps réel
 * - Intégration avec le stock de produits
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect } from 'react';
import { 
    XMarkIcon,
    CameraIcon,
    PlusIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { repairsAPI, clientsAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';

const QuickRepairForm = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [currentStep, setCurrentStep] = useState(1);
    
    const [formData, setFormData] = useState({
        client: '',
        bike_brand: '',
        bike_model: '',
        bike_type: 'other',
        repair_type: 'repair',
        description: '',
        store: 'ville_avray',
        priority: 'normal',
        estimated_completion: '',
        estimated_duration: '',
        estimated_cost: 0,
        photos: [null, null, null]
    });

    const [errors, setErrors] = useState({});

    // Charger les clients et produits
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [clientsRes, productsRes] = await Promise.all([
                clientsAPI.getAll(),
                productsAPI.getAll()
            ]);
            
            setClients(clientsRes.data.results || clientsRes.data);
            setProducts(productsRes.data.results || productsRes.data);
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }
    };

    // Valider le formulaire
    const validateStep = () => {
        const newErrors = {};
        
        if (currentStep === 1) {
            if (!formData.client) newErrors.client = 'Le client est requis';
            if (!formData.bike_brand) newErrors.bike_brand = 'La marque est requise';
            if (!formData.description) newErrors.description = 'La description est requise';
        }
        
        if (currentStep === 2) {
            if (!formData.store) newErrors.store = 'Le magasin est requis';
            if (!formData.priority) newErrors.priority = 'La priorité est requise';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Passer à l'étape suivante
    const nextStep = () => {
        if (validateStep()) {
            if (currentStep < 3) {
                setCurrentStep(currentStep + 1);
            } else {
                handleSubmit();
            }
        }
    };

    // Revenir à l'étape précédente
    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Gérer le changement de photo
    const handlePhotoChange = (index, file) => {
        const newPhotos = [...formData.photos];
        newPhotos[index] = file;
        setFormData({...formData, photos: newPhotos});
    };

    // Soumettre le formulaire avec gestion d'erreurs améliorée
    const handleSubmit = async () => {
        if (!validateStep()) return;
        
        try {
            setLoading(true);
            
            // Préparer les données pour l'API - conversion des types
            const submitData = new FormData();
            
            // Conversion explicite des types pour le backend
            submitData.append('client', parseInt(formData.client));
            submitData.append('bike_brand', formData.bike_brand);
            submitData.append('bike_model', formData.bike_model || '');
            submitData.append('bike_type', formData.bike_type);
            submitData.append('repair_type', formData.repair_type);
            submitData.append('description', formData.description);
            submitData.append('store', formData.store);
            submitData.append('priority', formData.priority);
            submitData.append('estimated_cost', parseFloat(formData.estimated_cost) || 0);
            
            if (formData.estimated_completion) {
                submitData.append('estimated_completion', formData.estimated_completion);
            }
            
            // Ajouter les photos
            formData.photos.forEach((photo, index) => {
                if (photo) {
                    submitData.append(`photo_${index + 1}`, photo);
                }
            });
            
            console.log('Submitting repair data:', Object.fromEntries(submitData));
            
            const response = await repairsAPI.create(submitData);
            
            toast.success('Réparation créée avec succès !');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Create repair error:', error);
            console.error('Error response data:', error.response?.data);
            console.error('Error response status:', error.response?.status);
            console.error('Error message:', error.message);
            
            // Afficher le détail complet de l'erreur
            let errorMsg = 'Erreur lors de la création';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.details) {
                    // Afficher les erreurs de validation champ par champ
                    errorMsg = Object.entries(data.details)
                        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                        .join('; ');
                } else if (data.error) {
                    errorMsg = data.error;
                } else {
                    errorMsg = JSON.stringify(data);
                }
            }
            toast.error(`Erreur: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    // Étapes du formulaire
    const steps = [
        { title: 'Informations principales', description: 'Client et vélo' },
        { title: 'Détails de la réparation', description: 'Magasin et priorité' },
        { title: 'Photos et finalisation', description: 'Photos et validation' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Nouvelle réparation</h2>
                            <p className="text-sm text-gray-600 mt-1">Création rapide en 3 étapes</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Progression */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => (
                                <div key={index} className="flex items-center">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                                        currentStep > index + 1
                                            ? 'bg-green-500 text-white'
                                            : currentStep === index + 1
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-300 text-gray-600'
                                    }`}>
                                        {currentStep > index + 1 ? (
                                            <CheckCircleIcon className="h-5 w-5" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <div className="ml-2">
                                        <div className={`text-sm font-medium ${
                                            currentStep === index + 1 ? 'text-blue-600' : 'text-gray-600'
                                        }`}>
                                            {step.title}
                                        </div>
                                        <div className="text-xs text-gray-500">{step.description}</div>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`flex-1 h-px mx-4 ${
                                            currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-300'
                                        }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Contenu du formulaire */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            {/* Client */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Client * {errors.client && <span className="text-red-500">{errors.client}</span>}
                                </label>
                                <select
                                    value={formData.client}
                                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Sélectionner un client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.first_name} {client.last_name} - {client.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Informations vélo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Marque du vélo * {errors.bike_brand && <span className="text-red-500">{errors.bike_brand}</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bike_brand}
                                        onChange={(e) => setFormData({...formData, bike_brand: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ex: Trek, Giant, Decathlon..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Modèle du vélo</label>
                                    <input
                                        type="text"
                                        value={formData.bike_model}
                                        onChange={(e) => setFormData({...formData, bike_model: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ex: Marlin 5, VTT 27.5..."
                                    />
                                </div>
                            </div>

                            {/* Type de vélo et type de réparation */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de vélo</label>
                                    <select
                                        value={formData.bike_type}
                                        onChange={(e) => setFormData({...formData, bike_type: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="other">Autre</option>
                                        <option value="mtb">VTT</option>
                                        <option value="road">Route</option>
                                        <option value="electric">Électrique</option>
                                        <option value="city">Ville</option>
                                        <option value="kids">Enfant</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de service</label>
                                    <select
                                        value={formData.repair_type}
                                        onChange={(e) => setFormData({...formData, repair_type: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="repair">Réparation</option>
                                        <option value="maintenance">Entretien</option>
                                        <option value="customization">Personnalisation</option>
                                        <option value="emergency">Urgence</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description du problème * {errors.description && <span className="text-red-500">{errors.description}</span>}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Décrivez le problème ou ce qui doit être réparé..."
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {/* Magasin et priorité */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Magasin * {errors.store && <span className="text-red-500">{errors.store}</span>}
                                    </label>
                                    <select
                                        value={formData.store}
                                        onChange={(e) => setFormData({...formData, store: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="ville_avray">Ville d'Avray</option>
                                        <option value="garches">Garches</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Priorité * {errors.priority && <span className="text-red-500">{errors.priority}</span>}
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="low">Basse</option>
                                        <option value="normal">Normale</option>
                                        <option value="high">Haute</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dates et durée */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de livraison estimée</label>
                                    <input
                                        type="date"
                                        value={formData.estimated_completion}
                                        onChange={(e) => setFormData({...formData, estimated_completion: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée estimée (heures)</label>
                                    <input
                                        type="number"
                                        value={formData.estimated_duration}
                                        onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ex: 2.5"
                                    />
                                </div>
                            </div>

                            {/* Coût estimé */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Coût estimé (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.estimated_cost}
                                    onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-4">
                            {/* Photos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Photos du vélo (optionnel)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[1, 2, 3].map((photoNum) => (
                                        <div key={photoNum} className="text-center">
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                                {formData.photos[photoNum - 1] ? (
                                                    <div className="relative">
                                                        <img
                                                            src={URL.createObjectURL(formData.photos[photoNum - 1])}
                                                            alt={`Photo ${photoNum}`}
                                                            className="w-full h-32 object-cover rounded"
                                                        />
                                                        <button
                                                            onClick={() => handlePhotoChange(photoNum - 1, null)}
                                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                        >
                                                            <XMarkIcon className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer">
                                                        <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                                                        <div className="mt-2">
                                                            <span className="text-sm text-gray-600">Photo {photoNum}</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handlePhotoChange(photoNum - 1, e.target.files[0])}
                                                                className="hidden"
                                                            />
                                                        </div>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Résumé */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">Résumé de la réparation</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Client:</span>
                                        <span className="font-medium">
                                            {clients.find(c => c.id == formData.client)?.first_name} {clients.find(c => c.id == formData.client)?.last_name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Vélo:</span>
                                        <span className="font-medium">{formData.bike_brand} {formData.bike_model}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Magasin:</span>
                                        <span className="font-medium">{formData.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Priorité:</span>
                                        <span className="font-medium">{formData.priority}</span>
                                    </div>
                                    {formData.estimated_cost > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Coût estimé:</span>
                                            <span className="font-medium">{formData.estimated_cost}€</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Précédent
                    </button>
                    
                    <button
                        onClick={nextStep}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Création...' : currentStep === 3 ? 'Créer la réparation' : 'Suivant'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickRepairForm;
