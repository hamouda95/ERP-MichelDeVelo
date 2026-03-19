/**
 * ============================================================================ 
 * COMPOSANT REPAIR TICKET - TICKET DE RÉPARATION DÉTAILLÉ
 * ============================================================================ 
 * 
 * Interface complète pour modifier un ticket de réparation :
 * - Informations détaillées du vélo et client
 * - Modification du statut et priorité
 * - Gestion des pièces et interventions
 * - Upload de photos
 * - Envoi de SMS au client
 * - Impression du ticket
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  WrenchScrewdriverIcon,
  ArrowLeftIcon,
  CameraIcon,
  ShoppingCartIcon,
  PencilIcon,
  PrinterIcon,
  UserIcon,
  PhoneIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { repairsAPI } from '../services/api';
import RepairPartsManager from '../components/RepairPartsManager';
import toast from 'react-hot-toast';

const RepairTicket = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [repair, setRepair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [showPartsModal, setShowPartsModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showSMSModal, setShowSMSModal] = useState(false);
    
    // Formulaire d'édition
    const [formData, setFormData] = useState({
        bike_brand: '',
        bike_model: '',
        bike_serial_number: '',
        bike_type: 'other',
        repair_type: 'repair',
        description: '',
        diagnosis: '',
        notes: '',
        priority: 'normal',
        estimated_completion: '',
        estimated_duration: '',
        estimated_cost: 0,
        max_budget: '',
        deposit_paid: 0,
        labor_hours: 0,
        labor_rate: 35.00,
        status: 'pending'
    });

    const loadRepair = useCallback(async () => {
        try {
            setLoading(true);
            const response = await repairsAPI.getById(id);
            const repairData = response.data;
            setRepair(repairData);
            
            // Remplir le formulaire avec les données existantes
            setFormData({
                bike_brand: repairData.bike_brand || '',
                bike_model: repairData.bike_model || '',
                bike_serial_number: repairData.bike_serial_number || '',
                bike_type: repairData.bike_type || 'other',
                repair_type: repairData.repair_type || 'repair',
                description: repairData.description || '',
                diagnosis: repairData.diagnosis || '',
                notes: repairData.notes || '',
                priority: repairData.priority || 'normal',
                estimated_completion: repairData.estimated_completion || '',
                estimated_duration: repairData.estimated_duration || '',
                estimated_cost: repairData.estimated_cost || 0,
                max_budget: repairData.max_budget || '',
                deposit_paid: repairData.deposit_paid || 0,
                labor_hours: repairData.labor_hours || 0,
                labor_rate: repairData.labor_rate || 35.00,
                status: repairData.status || 'pending'
            });
        } catch (error) {
            toast.error('Erreur lors du chargement du ticket');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Charger les détails de la réparation
    useEffect(() => {
        loadRepair();
    }, [id, loadRepair]);

    // Sauvegarder les modifications
    const handleSave = async () => {
        try {
            setLoading(true);
            
            // Valider et nettoyer les données avant envoi
            const cleanedData = {
                bike_brand: formData.bike_brand?.trim() || null,
                bike_model: formData.bike_model?.trim() || null,
                bike_serial_number: formData.bike_serial_number?.trim() || null,
                bike_type: formData.bike_type || 'other',
                repair_type: formData.repair_type || 'repair',
                description: formData.description?.trim() || null,
                diagnosis: formData.diagnosis?.trim() || null,
                notes: formData.notes?.trim() || null,
                priority: formData.priority || 'normal',
                estimated_completion: formData.estimated_completion || null,
                estimated_duration: formData.estimated_duration || null,
                estimated_cost: parseFloat(formData.estimated_cost) || 0,
                max_budget: formData.max_budget?.trim() || null,
                deposit_paid: parseFloat(formData.deposit_paid) || 0,
                labor_hours: parseFloat(formData.labor_hours) || 0,
                labor_rate: parseFloat(formData.labor_rate) || 35.00,
                status: formData.status || 'pending'
            };
            
            await repairsAPI.update(id, cleanedData);
            toast.success('Ticket mis à jour avec succès');
            setEditing(false);
            loadRepair(); // Recharger pour voir les modifications
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Mettre à jour le statut
    const handleStatusUpdate = async (newStatus) => {
        try {
            // Valider le statut
            if (!newStatus || !id) {
                toast.error('Statut invalide');
                return;
            }
            
            await repairsAPI.updateStatus(id, { status: newStatus });
            toast.success('Statut mis à jour');
            
            // Envoyer SMS et proposer la caisse si passage à "completed"
            if (newStatus === 'completed') {
                setShowSMSModal(true);
                // Stocker les infos pour la caisse
                const repairData = {
                    client: repair.client_details,
                    repair: {
                        id: repair.id,
                        bike_brand: repair.bike_brand,
                        bike_model: repair.bike_model,
                        description: repair.description,
                        estimated_cost: repair.estimated_cost
                    }
                };
                localStorage.setItem('pendingCheckout', JSON.stringify(repairData));
            }
            
            loadRepair();
        } catch (error) {
            toast.error('Erreur lors de la mise à jour du statut');
        }
    };

    // Envoyer SMS au client
    const handleSendSMS = async () => {
        try {
            await repairsAPI.sendNotification(id, {
                type: 'sms',
                message: `Bonjour ${repair.client_details?.first_name}, votre vélo ${repair.bike_brand} ${repair.bike_model} est réparé et prêt à être récupéré !`
            });
            toast.success('SMS envoyé au client');
            setShowSMSModal(false);
        } catch (error) {
            toast.error('Erreur lors de l\'envoi du SMS');
        }
    };

    // Imprimer le ticket
    const handlePrint = async () => {
        try {
            const response = await repairsAPI.printQuote(id);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ticket_${repair.reference_number}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Erreur lors de l\'impression du ticket');
        }
    };

    // Gérer le changement de photo
    const handlePhotoChange = async (photoNumber, file) => {
        try {
            const formData = new FormData();
            formData.append(`photo_${photoNumber}`, file);
            
            await repairsAPI.update(id, formData);
            toast.success('Photo mise à jour');
            loadRepair();
        } catch (error) {
            toast.error('Erreur lors de la mise à jour de la photo');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            delivered: 'bg-emerald-100 text-emerald-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
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
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!repair) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Ticket non trouvé</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/repairs-simple')}
                                className="inline-flex items-center text-gray-500 hover:text-gray-700"
                            >
                                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                                Retour à l'atelier
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Ticket {repair.reference_number}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Créé le {new Date(repair.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setEditing(!editing)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                {editing ? 'Annuler' : 'Modifier'}
                            </button>
                            
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <PrinterIcon className="h-4 w-4 mr-2" />
                                Imprimer
                            </button>
                            
                            {editing && (
                                <button
                                    onClick={handleSave}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Sauvegarder
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Colonne principale */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Informations principales */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de la réparation</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Statut et priorité */}
                                <div className="flex items-center space-x-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Statut</label>
                                        {editing ? (
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="pending">Réception vélo</option>
                                                <option value="in_progress">En réparation</option>
                                                <option value="completed">Réparé - SMS envoyé</option>
                                                <option value="delivered">Vélo récupéré</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(repair.status)}`}>
                                                {repair.status_display || repair.status}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Priorité</label>
                                        {editing ? (
                                            <select
                                                value={formData.priority}
                                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="low">Basse</option>
                                                <option value="normal">Normale</option>
                                                <option value="high">Haute</option>
                                                <option value="urgent">Urgente</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(repair.priority)}`}>
                                                {repair.priority_display || repair.priority}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Informations vélo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Marque du vélo</label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={formData.bike_brand}
                                            onChange={(e) => setFormData({...formData, bike_brand: e.target.value})}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        <p className="mt-1 text-gray-900">{repair.bike_brand}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Modèle du vélo</label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={formData.bike_model}
                                            onChange={(e) => setFormData({...formData, bike_model: e.target.value})}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        <p className="mt-1 text-gray-900">{repair.bike_model || 'Non spécifié'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Numéro de série</label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={formData.bike_serial_number}
                                            onChange={(e) => setFormData({...formData, bike_serial_number: e.target.value})}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    ) : (
                                        <p className="mt-1 text-gray-900">{repair.bike_serial_number || 'Non spécifié'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type de vélo</label>
                                    {editing ? (
                                        <select
                                            value={formData.bike_type}
                                            onChange={(e) => setFormData({...formData, bike_type: e.target.value})}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="other">Autre</option>
                                            <option value="mtb">VTT</option>
                                            <option value="road">Route</option>
                                            <option value="electric">Électrique</option>
                                            <option value="city">Ville</option>
                                            <option value="kids">Enfant</option>
                                        </select>
                                    ) : (
                                        <p className="mt-1 text-gray-900">{repair.bike_type_display || 'Autre'}</p>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Description du problème</label>
                                {editing ? (
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        rows={3}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{repair.description}</p>
                                )}
                            </div>

                            {/* Diagnostic */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Diagnostic technique</label>
                                {editing ? (
                                    <textarea
                                        value={formData.diagnosis}
                                        onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                                        rows={2}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{repair.diagnosis || 'Non renseigné'}</p>
                                )}
                            </div>

                            {/* Notes internes */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Notes internes</label>
                                {editing ? (
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        rows={2}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{repair.notes || 'Aucune note'}</p>
                                )}
                            </div>
                        </div>

                        {/* Photos */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos du vélo</h2>
                            
                            <div className="grid grid-cols-3 gap-4">
                                {[1, 2, 3].map((photoNum) => (
                                    <div key={photoNum} className="text-center">
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                            {repair[`photo_${photoNum}_url`] ? (
                                                <div className="relative">
                                                    <img
                                                        src={repair[`photo_${photoNum}_url`]}
                                                        alt={`Vélo ${repair.bike_brand} ${repair.bike_model} - Photo ${photoNum}`}
                                                        className="w-full h-32 object-cover rounded"
                                                    />
                                                    {editing && (
                                                        <button
                                                            onClick={() => document.getElementById(`photo_${photoNum}`).click()}
                                                            className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600"
                                                        >
                                                            <PencilIcon className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer">
                                                    <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="mt-2">
                                                        <span className="text-sm text-gray-600">Photo {photoNum}</span>
                                                        {editing && (
                                                            <input
                                                                id={`photo_${photoNum}`}
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handlePhotoChange(photoNum, e.target.files[0])}
                                                                className="hidden"
                                                            />
                                                        )}
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Colonne latérale */}
                    <div className="space-y-6">
                        {/* Informations client */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations client</h2>
                            
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {repair.client_details?.first_name} {repair.client_details?.last_name}
                                        </p>
                                        <p className="text-sm text-gray-500">{repair.client_details?.email}</p>
                                    </div>
                                </div>
                                
                                {repair.client_details?.phone && (
                                    <div className="flex items-center">
                                        <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                                        <p className="text-gray-900">{repair.client_details.phone}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Coûts */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Coûts</h2>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Coût estimé</span>
                                    <span className="font-medium">{repair.estimated_cost}€</span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Coût final</span>
                                    <span className="font-medium">{repair.final_cost || 0}€</span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Acompte versé</span>
                                    <span className="font-medium">{repair.deposit_paid}€</span>
                                </div>
                                
                                {repair.max_budget && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Budget maximum</span>
                                        <span className="font-medium">{repair.max_budget}€</span>
                                    </div>
                                )}
                                
                                <div className="border-t pt-3">
                                    <div className="flex justify-between font-semibold">
                                        <span>Reste à payer</span>
                                        <span>{(repair.final_cost || repair.estimated_cost || 0) - repair.deposit_paid}€</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions rapides */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
                            
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowPartsModal(true)}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                                    Gérer les pièces
                                </button>
                                
                                <button
                                    onClick={() => setShowStatusModal(true)}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <ClockIcon className="h-4 w-4 mr-2" />
                                    Changer le statut
                                </button>
                                
                                <button
                                    onClick={handleSendSMS}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <BellIcon className="h-4 w-4 mr-2" />
                                    Envoyer SMS
                                </button>
                                
                                <button
                                    onClick={handlePrint}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <PrinterIcon className="h-4 w-4 mr-2" />
                                    Imprimer le ticket
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal des pièces */}
            {showPartsModal && (
                <RepairPartsManager 
                    repair={repair} 
                    onClose={() => setShowPartsModal(false)}
                    onUpdate={loadRepair}
                />
            )}

            {/* Modal de changement de statut */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer le statut</h3>
                        
                        <div className="space-y-3">
                            {[
                                { value: 'pending', label: 'Réception vélo' },
                                { value: 'in_progress', label: 'En réparation' },
                                { value: 'completed', label: 'Réparé - SMS envoyé' },
                                { value: 'delivered', label: 'Vélo récupéré' }
                            ].map(status => (
                                <button
                                    key={status.value}
                                    onClick={() => {
                                        handleStatusUpdate(status.value);
                                        setShowStatusModal(false);
                                    }}
                                    className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal SMS */}
            {showSMSModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Envoyer SMS au client</h3>
                        
                        <p className="text-gray-600 mb-4">
                            Envoyer un SMS à {repair.client_details?.first_name} pour l'informer que son vélo est prêt ?
                        </p>
                        
                        <div className="bg-gray-50 p-3 rounded-md mb-4">
                            <p className="text-sm text-gray-700">
                                "Bonjour {repair.client_details?.first_name}, votre vélo {repair.bike_brand} {repair.bike_model} est réparé et prêt à être récupéré !"
                            </p>
                        </div>
                        
                        <div className="flex justify-between space-x-3">
                            <button
                                onClick={() => {
                                    setShowSMSModal(false);
                                    navigate('/cashier');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                <ShoppingCartIcon className="w-4 h-4" />
                                Aller à la caisse
                            </button>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowSMSModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSendSMS}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Envoyer SMS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepairTicket;
