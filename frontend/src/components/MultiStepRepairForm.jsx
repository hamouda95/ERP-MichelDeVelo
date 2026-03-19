/**
 * Composant de formulaire de réparation en plusieurs étapes
 * Simplifie l'UX en divisant le formulaire en étapes logiques
 */
import React, { useState, useCallback } from 'react';
import { 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { repairsAPI, clientsAPI } from '../services/api_consolidated';
import toast from 'react-hot-toast';

const MultiStepRepairForm = ({ onClose, onRepairCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Étape 1: Informations client
    client_search: '',
    selected_client: null,
    new_client_mode: false,
    new_client: {
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    },
    
    // Étape 2: Informations vélo
    bike_brand: '',
    bike_model: '',
    bike_type: 'other',
    bike_serial_number: '',
    
    // Étape 3: Problème et diagnostic
    repair_type: 'repair',
    description: '',
    diagnosis: '',
    
    // Étape 4: Coûts et priorité
    priority: 'normal',
    estimated_cost: '',
    max_budget: '',
    estimated_duration: '',
    
    // Étape 5: Confirmation
    store: 'ville_avray',
    notes: ''
  });

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);

  // Étapes du formulaire
  const steps = [
    { id: 1, title: 'Client', icon: UserIcon },
    { id: 2, title: 'Vélo', icon: WrenchScrewdriverIcon },
    { id: 3, title: 'Problème', icon: ExclamationTriangleIcon },
    { id: 4, title: 'Coûts', icon: CurrencyDollarIcon },
    { id: 5, title: 'Confirmation', icon: CheckCircleIcon }
  ];

  // Recherche de clients avec debounce
  const searchClients = useCallback(async (query) => {
    if (query.length < 2) {
      setClients([]);
      return;
    }
    
    setSearchingClient(true);
    try {
      const response = await clientsAPI.getAll({ search: query });
      setClients(response.data.results || []);
    } catch (error) {
      toast.error('Erreur lors de la recherche de clients');
    } finally {
      setSearchingClient(false);
    }
  }, []);

  // Validation d'étape
  const validateStep = useCallback((step) => {
    switch (step) {
      case 1:
        return formData.selected_client || 
               (formData.new_client_mode && 
                formData.new_client.first_name && 
                formData.new_client.last_name && 
                formData.new_client.email);
      
      case 2:
        return formData.bike_brand.trim() !== '';
      
      case 3:
        return formData.description.trim() !== '';
      
      case 4:
        return formData.estimated_cost && 
               parseFloat(formData.estimated_cost) > 0;
      
      default:
        return true;
    }
  }, [formData]);

  // Navigation entre étapes
  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      toast.error('Veuillez compléter cette étape avant de continuer');
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  // Sélection de client
  const selectClient = useCallback((client) => {
    setFormData(prev => ({
      ...prev,
      selected_client: client,
      client_search: `${client.first_name} ${client.last_name}`,
      new_client_mode: false
    }));
  }, []);

  // Soumission du formulaire
  const handleSubmit = useCallback(async () => {
    if (!validateStep(5)) {
      toast.error('Veuillez vérifier toutes les étapes');
      return;
    }

    setLoading(true);
    try {
      const repairData = {
        client: formData.selected_client.id,
        bike_brand: formData.bike_brand,
        bike_model: formData.bike_model,
        bike_type: formData.bike_type,
        bike_serial_number: formData.bike_serial_number,
        repair_type: formData.repair_type,
        description: formData.description,
        diagnosis: formData.diagnosis,
        priority: formData.priority,
        estimated_cost: parseFloat(formData.estimated_cost),
        max_budget: formData.max_budget || null,
        estimated_duration: formData.estimated_duration || null,
        store: formData.store,
        notes: formData.notes
      };

      const response = await repairsAPI.create(repairData);
      toast.success('Réparation créée avec succès');
      onRepairCreated && onRepairCreated(response.data);
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la création de la réparation');
      console.error('Repair creation error:', error);
    } finally {
      setLoading(false);
    }
  }, [formData, onRepairCreated, onClose]);

  // Rendu de l'étape actuelle
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Informations Client</h3>
            
            {/* Recherche de client existant */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un client existant
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.client_search}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, client_search: e.target.value }));
                    searchClients(e.target.value);
                  }}
                  placeholder="Tapez le nom ou email du client..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {searchingClient && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
              
              {/* Résultats de recherche */}
              {clients.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {clients.map(client => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => selectClient(client)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                    >
                      <div className="font-medium">{client.first_name} {client.last_name}</div>
                      <div className="text-sm text-gray-500">{client.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle nouveau client */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  new_client_mode: !prev.new_client_mode,
                  selected_client: null 
                }))}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {formData.new_client_mode ? 'Choisir un client existant' : 'Créer un nouveau client'}
              </button>
            </div>

            {/* Formulaire nouveau client */}
            {formData.new_client_mode && (
              <div className="space-y-4 mt-6 p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium mb-3">Nouveau Client</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={formData.new_client.first_name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      new_client: { ...prev.new_client, first_name: e.target.value } 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Nom"
                    value={formData.new_client.last_name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      new_client: { ...prev.new_client, last_name: e.target.value } 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.new_client.email}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      new_client: { ...prev.new_client, email: e.target.value } 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-md col-span-2"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={formData.new_client.phone}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      new_client: { ...prev.new_client, phone: e.target.value } 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-md col-span-2"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Informations du Vélo</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marque du vélo *
                </label>
                <input
                  type="text"
                  value={formData.bike_brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, bike_brand: e.target.value }))}
                  placeholder="Ex: Trek, Specialized, Giant..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modèle du vélo
                </label>
                <input
                  type="text"
                  value={formData.bike_model}
                  onChange={(e) => setFormData(prev => ({ ...prev, bike_model: e.target.value }))}
                  placeholder="Ex: Marlin 7, Allez..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de vélo
                </label>
                <select
                  value={formData.bike_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, bike_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de série
                </label>
                <input
                  type="text"
                  value={formData.bike_serial_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, bike_serial_number: e.target.value }))}
                  placeholder="Numéro de série du cadre..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Problème et Diagnostic</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de service
                </label>
                <select
                  value={formData.repair_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, repair_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="repair">Réparation</option>
                  <option value="maintenance">Entretien</option>
                  <option value="customization">Personnalisation</option>
                  <option value="emergency">Urgence</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description du problème *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez le problème rencontré..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnostic technique
                </label>
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Diagnostic effectué par le mécanicien..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Coûts et Priorité</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coût estimé (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget maximum (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.max_budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_budget: e.target.value }))}
                  placeholder="Pas de limite"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée estimée (heures)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                  placeholder="2.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Magasin
                </label>
                <select
                  value={formData.store}
                  onChange={(e) => setFormData(prev => ({ ...prev, store: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ville_avray">Ville d'Avray</option>
                  <option value="garches">Garches</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Confirmation</h3>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-medium mb-4">Récapitulatif de la réparation</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Client:</span>
                  <span>{formData.selected_client?.first_name} {formData.selected_client?.last_name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Vélo:</span>
                  <span>{formData.bike_brand} {formData.bike_model}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Problème:</span>
                  <span className="text-gray-600">{formData.description}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Coût estimé:</span>
                  <span className="font-semibold text-green-600">{formData.estimated_cost}€</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Priorité:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {formData.priority === 'urgent' ? 'Urgente' : 
                     formData.priority === 'high' ? 'Haute' : 
                     formData.priority === 'low' ? 'Basse' : 'Normale'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes internes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes pour l'équipe d'atelier..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Nouvelle Réparation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep > step.id ? 'bg-blue-600 text-white' : 
                    currentStep === step.id ? 'bg-blue-100 text-blue-600' : 
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-2" />
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              Étape {currentStep} sur {steps.length}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-2" />
              Précédent
            </button>
            
            <div className="text-sm text-gray-500">
              Étape {currentStep} / {steps.length}
            </div>
            
            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                className="flex items-center px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Suivant
                <ChevronRightIcon className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center px-6 py-3 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Créer la réparation
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiStepRepairForm;
