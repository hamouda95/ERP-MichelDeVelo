/**
 * ============================================================================
 * COMPOSANT REPAIRS - GESTION DES RÉPARATIONS DE VÉLOS
 * ============================================================================
 * 
 * Ce composant gère l'ensemble du cycle de vie des réparations de vélos :
 * - Création de nouvelles réparations
 * - Modification des réparations existantes
 * - Affichage et filtrage de la liste des réparations
 * - Suppression de réparations
 * - Impression de tickets de prise en charge
 * - Gestion des pièces nécessaires
 * 
 * ============================================================================
 * STRUCTURE DU COMPOSANT
 * ============================================================================
 * 
 * 1. IMPORTS ET DÉPENDANCES
 * 2. ÉTATS (STATE)
 * 3. CONFIGURATIONS
 * 4. FONCTIONS UTILITAIRES
 * 5. FONCTIONS API (CRUD)
 * 6. GESTION DES ÉVÉNEMENTS
 * 7. FILTRAGE ET RECHERCHE
 * 8. RENDU JSX (UI)
 * 
 * ============================================================================
 * CHAMPS OBLIGATOIRES DANS LE FORMULAIRE
 * ============================================================================
 * 
 * Champs avec validation HTML (required) ET JavaScript :
 * - client : ID du client (validation JS dans handleSubmit ligne ~485)
 * - store : Magasin (validation JS dans handleSubmit ligne ~490)
 * 
 * Champs avec validation HTML uniquement (required) :
 * - bike_brand : Type de produit déposé (ex: VTT, Vélo électrique)
 * - priority : Niveau de priorité de la réparation
 * - description : Description détaillée du problème
 * 
 * Pour ajouter/retirer un champ obligatoire :
 * 1. Ajouter/retirer l'attribut "required" dans le JSX de l'input
 * 2. Ajouter/retirer l'astérisque "*" dans le label
 * 3. Optionnel : Ajouter une validation JavaScript dans handleSubmit
 * 
 * Exemple pour rendre "bike_model" obligatoire :
 * ```jsx
 * <label>Modèle du vélo *</label>  // Ajouter *
 * <input required ... />            // Ajouter required
 * ```
 * 
 * ============================================================================
 */

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
  // ============================================================================
  // ÉTATS (STATE) DU COMPOSANT
  // ============================================================================
  
  /**
   * État principal contenant la liste de toutes les réparations
   * Structure de chaque réparation :
   * {
   *   id: number,
   *   reference_number: string,
   *   client: { id, first_name, last_name, email, phone },
   *   store: 'ville_avray' | 'garches',
   *   bike_brand: string,
   *   bike_model: string,
   *   bike_serial_number: string,
   *   description: string,
   *   diagnosis: string,
   *   estimated_cost: number,
   *   final_cost: number,
   *   status: 'pending' | 'in_progress' | 'waiting_parts' | 'completed' | 'delivered' | 'cancelled',
   *   priority: 'low' | 'normal' | 'high' | 'urgent',
   *   parts_needed: Array<{ product, product_name, quantity, unit_price }>,
   *   notes: string,
   *   estimated_completion: date,
   *   max_budget: number,
   *   created_at: date
   * }
   */
  const [repairs, setRepairs] = useState([]);
  
  /**
   * Liste de tous les clients disponibles pour la recherche
   * Utilisé pour l'autocomplétion dans le champ de sélection client
   */
  const [clients, setClients] = useState([]);
  
  /**
   * Liste de tous les produits/pièces disponibles
   * Utilisé pour ajouter des pièces nécessaires à une réparation
   */
  const [products, setProducts] = useState([]);
  
  /**
   * Contrôle l'affichage du modal de création/édition
   * true = modal ouvert, false = modal fermé
   */
  const [showModal, setShowModal] = useState(false);
  
  /**
   * Contrôle l'affichage du modal de détails
   * true = modal ouvert, false = modal fermé
   */
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  /**
   * Stocke la réparation actuellement sélectionnée pour édition ou consultation
   * null = mode création, object = mode édition
   */
  const [selectedRepair, setSelectedRepair] = useState(null);
  
  /**
   * Terme de recherche pour filtrer les réparations
   * Recherche dans : référence, nom client, marque vélo, modèle vélo
   */
  const [searchTerm, setSearchTerm] = useState('');
  
  /**
   * Filtre par statut de réparation
   * Valeurs possibles : 'all' | 'pending' | 'in_progress' | 'waiting_parts' | 'completed' | 'delivered' | 'cancelled'
   */
  const [filterStatus, setFilterStatus] = useState('all');
  
  /**
   * Filtre par magasin
   * Valeurs possibles : 'all' | 'ville_avray' | 'garches'
   */
  const [filterStore, setFilterStore] = useState('all');
  
  /**
   * Filtre par nom de client (recherche partielle)
   */
  const [filterClientName, setFilterClientName] = useState('');
  
  /**
   * Filtre par date de création (format ISO : YYYY-MM-DD)
   */
  const [filterDate, setFilterDate] = useState('');
  
  /**
   * Gestion des notifications toast
   * Structure : { show: boolean, message: string, type: 'success' | 'error' }
   */
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  /**
   * Indicateur de chargement global
   * true = opération en cours (désactive les boutons), false = prêt
   */
  const [loading, setLoading] = useState(false);
  
  // ============================================================================
  // ÉTATS POUR LA RECHERCHE ET SÉLECTION DE CLIENTS
  // ============================================================================
  
  /**
   * Terme de recherche pour trouver un client
   * Recherche dans : prénom, nom, email, téléphone
   */
  const [clientSearch, setClientSearch] = useState('');
  
  /**
   * Résultats de la recherche de clients
   * Mis à jour automatiquement lors de la saisie avec debounce de 300ms
   */
  const [clientSearchResults, setClientSearchResults] = useState([]);
  
  /**
   * Contrôle l'affichage du dropdown de résultats de recherche client
   */
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  /**
   * Nom complet du client sélectionné (pour affichage)
   */
  const [selectedClientName, setSelectedClientName] = useState('');
  
  /**
   * Référence DOM pour détecter les clics en dehors du dropdown
   */
  const clientSearchRef = useRef(null);

  // ============================================================================
  // ÉTAT DU FORMULAIRE
  // ============================================================================
  
  /**
   * Données du formulaire de création/édition de réparation
   * Tous les champs sont synchronisés avec les inputs du formulaire
   */
  const [formData, setFormData] = useState({
    client: '',                    // ID du client (OBLIGATOIRE)
    store: '',                     // Magasin (OBLIGATOIRE)
    bike_brand: '',                // Type de produit (OBLIGATOIRE)
    bike_model: '',                // Modèle du vélo
    bike_serial_number: '',        // Numéro de série
    description: '',               // Description du problème (OBLIGATOIRE)
    diagnosis: '',                 // Diagnostic technique
    estimated_cost: '',            // Coût estimé en euros
    final_cost: '',                // Coût final en euros
    status: 'pending',             // Statut par défaut
    priority: 'normal',            // Priorité par défaut (OBLIGATOIRE)
    parts_needed: [],              // Tableau des pièces nécessaires
    notes: '',                     // Notes complémentaires
    estimated_completion: '',      // Date de livraison estimée
    max_budget: ''                 // Budget maximum du client
  });

  /**
   * Données pour l'ajout d'une nouvelle pièce
   * Réinitialisé après chaque ajout
   */
  const [newPart, setNewPart] = useState({
    product: '',                   // ID du produit
    quantity: 1                    // Quantité par défaut
  });

  // ============================================================================
  // CONFIGURATIONS - STATUTS ET PRIORITÉS
  // ============================================================================
  
  /**
   * Configuration des statuts de réparation
   * Chaque statut a un label (texte affiché) et une couleur (classes Tailwind)
   * 
   * Statuts disponibles :
   * - pending : Réparation en attente de prise en charge
   * - in_progress : Réparation en cours de traitement
   * - waiting_parts : En attente de réception des pièces
   * - completed : Réparation terminée, en attente de retrait
   * - delivered : Vélo retiré par le client
   * - cancelled : Réparation annulée
   */
  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    waiting_parts: { label: 'Attente pièces', color: 'bg-gray-100 text-gray-800' },
    completed: { label: 'Terminée', color: 'bg-green-100 text-green-800' },
    delivered: { label: 'Livrée', color: 'bg-purple-100 text-purple-800' },
    cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
  };

  /**
   * Configuration des niveaux de priorité
   * Détermine l'ordre de traitement des réparations
   * 
   * Priorités disponibles :
   * - low : Basse priorité (traitement standard)
   * - normal : Priorité normale (par défaut)
   * - high : Haute priorité (traitement rapide)
   * - urgent : Urgente (traitement immédiat)
   */
  const priorityConfig = {
    low: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
    normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
    high: { label: 'Haute', color: 'bg-orange-100 text-orange-800' },
    urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
  };

  /**
   * Libellés des magasins pour l'affichage
   * Conversion des valeurs techniques en noms affichables
   */
  const storeLabels = {
    ville_avray: "Ville d'Avray",
    garches: 'Garches'
  };

  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================

  /**
   * Affiche une notification toast pendant 3 secondes
   * 
   * @param {string} message - Le message à afficher
   * @param {string} type - Type de notification ('success' ou 'error')
   * 
   * Utilisation :
   * showNotification('Réparation créée avec succès', 'success');
   * showNotification('Erreur lors de la suppression', 'error');
   */
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    // Auto-fermeture après 3 secondes
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  /**
   * Formate le nom complet d'un client de manière robuste
   * 
   * @param {Object} client - Objet client contenant les informations
   * @returns {string} - Nom formaté du client
   * 
   * GESTION DES CAS :
   * 1. Si client.name existe → retourne client.name
   * 2. Si first_name ET last_name existent → retourne "Prénom Nom"
   * 3. Si seulement first_name existe → retourne first_name
   * 4. Si seulement last_name existe → retourne last_name
   * 5. Si aucune information → retourne "Client inconnu"
   * 
   * IMPORTANT : Le backend peut renvoyer les données dans deux formats :
   * - Format direct : repair.client avec { id, first_name, last_name, ... }
   * - Format imbriqué : repair.client_info avec { id, name, first_name, last_name, ... }
   * Cette fonction gère les deux cas automatiquement.
   * 
   * Cette fonction évite les affichages "undefined undefined" ou espaces vides
   * 
   * Exemples :
   * getClientFullName({ name: "Jean Dupont" }) → "Jean Dupont"
   * getClientFullName({ first_name: "Jean", last_name: "Dupont" }) → "Jean Dupont"
   * getClientFullName({ first_name: "Jean" }) → "Jean"
   * getClientFullName({}) → "Client inconnu"
   */
  const getClientFullName = useCallback((client) => {
    if (!client) return 'Client inconnu';
    
    // Cas 1 : Le champ 'name' existe déjà (format complet)
    if (client.name) return client.name;
    
    // Cas 2 : Construction à partir de first_name et last_name
    const firstName = client.first_name?.trim() || '';
    const lastName = client.last_name?.trim() || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    if (firstName) return firstName;
    if (lastName) return lastName;
    
    // Cas par défaut : aucune information disponible
    return 'Client inconnu';
  }, []);

  // ============================================================================
  // FONCTIONS DE RÉCUPÉRATION DES DONNÉES (API)
  // ============================================================================

  /**
   * Récupère toutes les réparations depuis l'API
   * 
   * Gère les différents formats de réponse possibles :
   * - Tableau direct : data = [...]
   * - Objet avec results : data = { results: [...] }
   * - Objet avec repairs : data = { repairs: [...] }
   * 
   * Met à jour l'état 'repairs' avec les données récupérées
   * Affiche une notification en cas d'erreur
   */
  const fetchRepairs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await repairsAPI.getAll();
      const data = response.data;
      
      // Normalisation du format de données (support de plusieurs structures)
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

  /**
   * Récupère tous les clients depuis l'API
   * 
   * Gère les différents formats de réponse possibles (même logique que fetchRepairs)
   * Utilisé pour l'autocomplétion dans la recherche de clients
   */
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

  /**
   * Récupère tous les produits depuis l'API
   * 
   * Utilisé pour afficher la liste des pièces disponibles
   * lors de l'ajout de pièces nécessaires à une réparation
   */
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

  // ============================================================================
  // EFFETS (HOOKS useEffect)
  // ============================================================================

  /**
   * Effet exécuté au montage du composant
   * Charge toutes les données nécessaires (réparations, clients, produits)
   */
  useEffect(() => {
    fetchRepairs();
    fetchClients();
    fetchProducts();
  }, [fetchRepairs, fetchClients, fetchProducts]);

  /**
   * Effet pour gérer la fermeture du dropdown de recherche client
   * Ferme le dropdown lorsqu'un clic est détecté en dehors
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Effet pour la recherche de clients en temps réel avec debounce
   * 
   * Déclenché lorsque : clientSearch change
   * Délai (debounce) : 300ms
   * 
   * Logique :
   * 1. Si la recherche contient au moins 2 caractères
   * 2. Filtre les clients par nom, email ou téléphone
   * 3. Affiche les résultats dans le dropdown
   * 4. Sinon, masque le dropdown
   */
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearch.length >= 2) {
        try {
          // Filtrage local des clients (recherche fuzzy)
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

    // Debounce : attend 300ms après la dernière frappe avant de lancer la recherche
    const debounceTimer = setTimeout(searchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [clientSearch, clients]);

  // ============================================================================
  // GESTION DES ÉVÉNEMENTS - SÉLECTION CLIENT
  // ============================================================================

  /**
   * Gestionnaire de sélection d'un client depuis le dropdown
   * 
   * @param {Object} client - L'objet client sélectionné
   * 
   * Actions effectuées :
   * 1. Met à jour l'ID du client dans le formulaire
   * 2. Affiche le nom complet du client
   * 3. Remplit le champ de recherche avec le nom
   * 4. Ferme le dropdown
   */
  const handleSelectClient = (client) => {
    setFormData({ ...formData, client: client.id });
    setSelectedClientName(`${client.first_name} ${client.last_name}`);
    setClientSearch(`${client.first_name} ${client.last_name}`);
    setShowClientDropdown(false);
  };

  // ============================================================================
  // GESTION DES MODALS - OUVERTURE/FERMETURE
  // ============================================================================

  /**
   * Ouvre le modal de création ou d'édition d'une réparation
   * 
   * @param {Object|null} repair - Réparation à éditer (null pour création)
   * 
   * Mode CRÉATION (repair = null) :
   * - Réinitialise tous les champs du formulaire
   * - Utilise les valeurs par défaut (status='pending', priority='normal')
   * 
   * Mode ÉDITION (repair = object) :
   * - Pré-remplit le formulaire avec les données de la réparation
   * - Conserve toutes les valeurs existantes
   * - Affiche le nom du client
   */
  const openModal = (repair = null) => {
    if (repair) {
      // MODE ÉDITION : Pré-remplissage du formulaire
      setSelectedRepair(repair);
      
      // Le backend peut renvoyer soit repair.client soit repair.client_info
      const clientData = repair.client_info || repair.client;
      
      setFormData({
        client: clientData.id,
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
        estimated_completion: repair.estimated_completion || '',
        max_budget: repair.max_budget || ''
      });
      // Affichage du nom du client avec la fonction utilitaire
      const clientName = getClientFullName(clientData);
      setSelectedClientName(clientName);
      setClientSearch(clientName);
    } else {
      // MODE CRÉATION : Réinitialisation complète
      setSelectedRepair(null);
      setFormData({
        client: '',
        store: '',
        bike_brand: '',
        bike_model: '',
        bike_serial_number: '',
        description: '',
        diagnosis: '',
        estimated_cost: '',
        final_cost: '',
        status: 'pending',        // Statut par défaut
        priority: 'normal',       // Priorité par défaut
        parts_needed: [],
        notes: '',
        estimated_completion: '',
        max_budget: ''
      });
      setSelectedClientName('');
      setClientSearch('');
    }
    setShowModal(true);
  };

  // ============================================================================
  // GESTION DES ÉVÉNEMENTS - SOUMISSION DU FORMULAIRE
  // ============================================================================

  /**
   * Gestionnaire de soumission du formulaire (création/édition)
   * 
   * @param {Event} e - Événement de soumission du formulaire
   * 
   * VALIDATIONS EFFECTUÉES :
   * 1. Vérification que le client est sélectionné (OBLIGATOIRE)
   * 2. Vérification que le magasin est sélectionné (OBLIGATOIRE)
   * 
   * TRAITEMENT DES DONNÉES :
   * 1. Conversion des champs numériques (estimated_cost, final_cost, max_budget)
   * 2. Gestion des valeurs null pour max_budget si non renseigné
   * 
   * ACTIONS :
   * - Mode CRÉATION : Appel API repairsAPI.create()
   * - Mode ÉDITION : Appel API repairsAPI.update()
   * 
   * APRÈS SUCCÈS :
   * - Affiche une notification de succès
   * - Rafraîchit la liste des réparations
   * - Ferme le modal
   * - Réinitialise la recherche client pour éviter les problèmes d'affichage
   * 
   * EN CAS D'ERREUR :
   * - Affiche une notification d'erreur avec le message de l'API
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // VALIDATION : Client obligatoire
    if (!formData.client) {
      showNotification('Veuillez sélectionner un client', 'error');
      return;
    }

    // VALIDATION : Magasin obligatoire
    if (!formData.store) {
      showNotification('Veuillez sélectionner un magasin', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Préparation des données : conversion des champs numériques
      const dataToSend = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0,
        final_cost: formData.final_cost ? parseFloat(formData.final_cost) : 0,
        max_budget: formData.max_budget ? parseFloat(formData.max_budget) : null,
      };
      
      // Appel API selon le mode (création ou édition)
      if (selectedRepair) {
        // MODE ÉDITION
        await repairsAPI.update(selectedRepair.id, dataToSend);
        showNotification('Réparation mise à jour avec succès');
      } else {
        // MODE CRÉATION
        await repairsAPI.create(dataToSend);
        showNotification('Réparation créée avec succès');
      }
      
      // Rafraîchissement de la liste et fermeture du modal
      await fetchRepairs();
      setShowModal(false);
      
      // Réinitialisation de la recherche client pour éviter les problèmes
      setClientSearch('');
      setSelectedClientName('');
      setClientSearchResults([]);
      
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

  // ============================================================================
  // GESTION DES ÉVÉNEMENTS - SUPPRESSION
  // ============================================================================

  /**
   * Gestionnaire de suppression d'une réparation
   * 
   * @param {number} id - ID de la réparation à supprimer
   * 
   * SÉCURITÉ :
   * - Demande une confirmation via window.confirm()
   * - Annule l'opération si l'utilisateur clique sur "Annuler"
   * 
   * ACTIONS :
   * 1. Appel API repairsAPI.delete(id)
   * 2. Affiche une notification de succès
   * 3. Rafraîchit la liste des réparations
   * 
   * EN CAS D'ERREUR :
   * - Affiche une notification d'erreur
   * - La réparation n'est pas supprimée
   */
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

  // ============================================================================
  // GESTION DES ÉVÉNEMENTS - IMPRESSION (BACKEND)
  // ============================================================================

  /**
   * Gestionnaire d'impression d'un bon de réparation (PDF généré par le backend)
   * 
   * @param {number} repairId - ID de la réparation à imprimer
   * 
   * FONCTIONNEMENT :
   * 1. Appel API repairsAPI.print(repairId) qui renvoie un PDF
   * 2. Création d'un Blob à partir de la réponse
   * 3. Création d'un lien de téléchargement temporaire
   * 4. Déclenchement automatique du téléchargement
   * 5. Nettoyage du lien temporaire
   * 
   * NOTE : Cette fonction nécessite un endpoint backend qui génère le PDF
   */
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

  // ============================================================================
  // GESTION DES PIÈCES NÉCESSAIRES
  // ============================================================================

  /**
   * Ajoute une pièce à la liste des pièces nécessaires
   * 
   * VALIDATIONS :
   * - Le produit doit être sélectionné
   * - La quantité doit être > 0
   * 
   * ACTIONS :
   * 1. Recherche les détails du produit sélectionné
   * 2. Ajoute la pièce au tableau parts_needed avec :
   *    - product : ID du produit
   *    - product_name : Nom du produit (pour affichage)
   *    - quantity : Quantité sélectionnée
   *    - unit_price : Prix unitaire du produit
   * 3. Réinitialise le formulaire d'ajout
   */
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
        // Réinitialisation du formulaire d'ajout
        setNewPart({ product: '', quantity: 1 });
      }
    }
  };

  /**
   * Retire une pièce de la liste des pièces nécessaires
   * 
   * @param {number} index - Index de la pièce à retirer dans le tableau
   * 
   * Utilise la méthode filter pour créer un nouveau tableau
   * sans l'élément à l'index spécifié
   */
  const handleRemovePart = (index) => {
    const updatedParts = formData.parts_needed.filter((_, i) => i !== index);
    setFormData({ ...formData, parts_needed: updatedParts });
  };

  // ============================================================================
  // FILTRAGE ET RECHERCHE
  // ============================================================================

  /**
   * Filtre les réparations selon les critères de recherche et de filtres
   * 
   * CRITÈRES DE FILTRAGE :
   * 
   * 1. RECHERCHE GLOBALE (searchTerm) :
   *    - Numéro de référence
   *    - Nom du client
   *    - Marque du vélo
   *    - Modèle du vélo
   * 
   * 2. FILTRE PAR STATUT (filterStatus) :
   *    - 'all' = tous les statuts
   *    - Sinon = statut exact
   * 
   * 3. FILTRE PAR MAGASIN (filterStore) :
   *    - 'all' = tous les magasins
   *    - Sinon = magasin exact
   * 
   * 4. FILTRE PAR NOM CLIENT (filterClientName) :
   *    - Recherche partielle insensible à la casse
   * 
   * 5. FILTRE PAR DATE (filterDate) :
   *    - Recherche exacte sur la date de création (YYYY-MM-DD)
   * 
   * @returns {Array} - Tableau des réparations filtrées
   */
  const filteredRepairs = repairs.filter(repair => {
    // 1. Recherche globale
    // Le backend peut renvoyer soit repair.client soit repair.client_info
    const clientData = repair.client_info || repair.client;
    const clientName = getClientFullName(clientData);
    
    const matchesSearch = 
      repair.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.bike_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.bike_model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filtre par statut
    const matchesStatus = filterStatus === 'all' || repair.status === filterStatus;
    
    // 3. Filtre par magasin
    const matchesStore = filterStore === 'all' || repair.store === filterStore;
    
    // 4. Filtre par nom de client
    const matchesClientName = !filterClientName || clientName.toLowerCase().includes(filterClientName.toLowerCase());
    
    // 5. Filtre par date
    const matchesDate = !filterDate || (repair.created_at && new Date(repair.created_at).toISOString().split('T')[0] === filterDate);
    
    // Retourne true seulement si TOUS les critères sont remplis
    return matchesSearch && matchesStatus && matchesStore && matchesClientName && matchesDate;
  });

  // ============================================================================
  // IMPRESSION LOCALE (FRONTEND) - TICKET THERMIQUE
  // ============================================================================

  /**
   * Génère et imprime un ticket de prise en charge format 80mm
   * 
   * @param {Object} repair - Objet réparation contenant toutes les informations
   * 
   * FONCTIONNEMENT :
   * 1. Génère du HTML avec du CSS pour impression thermique (80mm)
   * 2. Ouvre une nouvelle fenêtre avec le contenu HTML
   * 3. Lance automatiquement la boîte de dialogue d'impression
   * 4. Ferme la fenêtre après impression
   * 
   * FORMAT DU TICKET :
   * - Largeur : 80mm (format ticket thermique standard)
   * - Police : Inter, 12px
   * - Sections :
   *   * En-tête : Nom du magasin + date/heure
   *   * Référence de la réparation
   *   * Informations client
   *   * Détails du vélo
   *   * Description du problème
   *   * Coût estimé et statut
   *   * Pied de page avec signature client
   * 
   * STYLE :
   * - Lignes en pointillés pour séparer les sections
   * - Texte centré pour l'en-tête et le pied de page
   * - Texte en gras pour les labels
   */
  const handleLocalPrint = (repair) => {
    // Génération du HTML du ticket
    const ticketHTML = `
      <html>
        <head>
          <title>Reçu de prise en charge</title>
          <style>
            /* Styles pour l'impression */
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

            /* Styles pour l'aperçu à l'écran */
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
          <!-- En-tête -->
          <div class="center ticket-header bold">🚲 Atelier Vélo - ${storeLabels[repair.store]}</div>
          <div class="center small">${new Date(repair.created_at).toLocaleDateString('fr-FR')} ${new Date(repair.created_at).toLocaleTimeString('fr-FR')}</div>
          <div class="line"></div>

          <!-- Informations principales -->
          <div class="ticket-section"><span class="bold">Réf:</span> ${repair.reference_number || '—'}</div>
          <div class="ticket-section"><span class="bold">Client:</span> ${getClientFullName(repair.client_info || repair.client)}</div>
          <div class="ticket-section"><span class="bold">Vélo:</span> ${repair.bike_brand} ${repair.bike_model}</div>
          ${repair.bike_serial_number ? `<div class="ticket-section"><span class="bold">N° série:</span> ${repair.bike_serial_number}</div>` : ''}
          <div class="line"></div>

          <!-- Description -->
          <div class="ticket-section"><span class="bold">Description:</span></div>
          <div class="ticket-section">${repair.description}</div>
          <div class="line"></div>

          <!-- Coût et statut -->
          <div class="ticket-section"><span class="bold">Coût estimé:</span> ${repair.estimated_cost ? repair.estimated_cost + ' €' : '—'}</div>
          <div class="ticket-section"><span class="bold">Statut:</span> ${statusConfig[repair.status]?.label || repair.status}</div>

          <!-- Pied de page -->
          <div class="line"></div>
          <div class="ticket-footer">Merci de votre confiance !</div>
          <div class="ticket-footer small">Conservez ce reçu pour le retrait de votre vélo</div>
          <div class="ticket-footer small">Signature client : __________________</div>
        </body>
      </html>
    `;

    // Ouverture de la fenêtre d'impression
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // ============================================================================
  // RENDU JSX (INTERFACE UTILISATEUR)
  // ============================================================================

  return (
    <div className="p-6">
      {/* ====================================================================
          HEADER - Titre et bouton de création
          ==================================================================== */}
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

      {/* ====================================================================
          FILTRES - Barre de recherche et filtres multiples
          ==================================================================== */}
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

          {/* Filtre par statut */}
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
            <option value="cancelled">Annulée</option>
          </select>

          {/* Filtre par magasin */}
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

      {/* ====================================================================
          TABLE - Liste des réparations
          ==================================================================== */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          // État de chargement
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRepairs.length === 0 ? (
          // Aucune réparation trouvée
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune réparation trouvée</p>
          </div>
        ) : (
          // Table des réparations
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
                    {/* Référence */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {repair.reference_number}
                    </td>
                    
                    {/* Client */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getClientFullName(repair.client_info || repair.client)}
                    </td>
                    
                    {/* Vélo */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {repair.bike_brand} {repair.bike_model}
                    </td>
                    
                    {/* Magasin */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {storeLabels[repair.store]}
                    </td>
                    
                    {/* Statut (badge coloré) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[repair.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusConfig[repair.status]?.label || repair.status}
                      </span>
                    </td>
                    
                    {/* Priorité (badge coloré) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityConfig[repair.priority]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {priorityConfig[repair.priority]?.label || repair.priority}
                      </span>
                    </td>
                    
                    {/* Date de création */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {repair.created_at ? new Date(repair.created_at).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    
                    {/* Coût estimé */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {repair.estimated_cost ? `${repair.estimated_cost}€` : '-'}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {/* Bouton Voir les détails */}
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
                        
                        {/* Bouton Modifier */}
                        <button
                          onClick={() => openModal(repair)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        
                        {/* Bouton Imprimer le ticket */}
                        <button
                          onClick={() => handleLocalPrint(repair)}
                          className="text-green-600 hover:text-green-900"
                          title="Imprimer le ticket"
                        >
                          <PrinterIcon className="w-5 h-5" />
                        </button>
                        
                        {/* Bouton Supprimer */}
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

      {/* ====================================================================
          MODAL - Création/Édition de réparation
          ==================================================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Titre du modal */}
              <h2 className="text-2xl font-bold mb-6">
                {selectedRepair ? 'Modifier la réparation' : 'Nouvelle réparation'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                {/* ============================================================
                    SECTION 1 : Client et Magasin
                    ============================================================ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Champ Client avec autocomplétion */}
                  <div ref={clientSearchRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
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

                      {/* Dropdown des résultats de recherche */}
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

                  {/* Champ Magasin */}
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

                {/* ============================================================
                    SECTION 2 : Produit déposé, Priorité, Budget et Coût
                    ============================================================ */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Produit déposé */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Produit déposé *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bike_brand}
                      onChange={(e) => setFormData({ ...formData, bike_brand: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ex: VTT, Vélo électrique..."
                    />
                  </div>

                  {/* Priorité */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorité *
                    </label>
                    <select
                      required
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget MAX (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.max_budget || ''}
                      onChange={(e) => setFormData({ ...formData, max_budget: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Budget max"
                    />
                  </div>

                  {/* Coût estimé avec indication visuelle si dépasse le budget */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coût estimé (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.estimated_cost || ''}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formData.max_budget && formData.estimated_cost
                          ? parseFloat(formData.estimated_cost) > parseFloat(formData.max_budget)
                            ? 'bg-red-100'  // Rouge si dépasse le budget
                            : 'bg-green-100' // Vert si dans le budget
                          : ''
                      }`}
                      placeholder="Coût estimé"
                    />
                  </div>
                </div>

                {/* ============================================================
                    SECTION 3 : Modèle du vélo et N° de série
                    ============================================================ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Modèle du vélo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modèle du vélo
                    </label>
                    <input
                      type="text"
                      value={formData.bike_model}
                      onChange={(e) => setFormData({ ...formData, bike_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ex: Giant Talon 2024"
                    />
                  </div>
                  
                  {/* N° de série */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      N° de série
                    </label>
                    <input
                      type="text"
                      value={formData.bike_serial_number}
                      onChange={(e) => setFormData({ ...formData, bike_serial_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="N° de série du vélo"
                    />
                  </div>
                </div>

                {/* ============================================================
                    SECTION 4 : Statut et Date estimée
                    ============================================================ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Statut */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Statut
                    </label>
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
                  
                  {/* Date de livraison estimée */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de livraison estimée
                    </label>
                    <input
                      type="date"
                      value={formData.estimated_completion}
                      onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* ============================================================
                    SECTION 5 : Description du problème
                    ============================================================ */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description du problème *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Décrivez le problème ou la réparation demandée..."
                  />
                </div>

                {/* ============================================================
                    SECTION 6 : Diagnostic
                    ============================================================ */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diagnostic
                  </label>
                  <textarea
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Diagnostic technique..."
                  />
                </div>

                {/* ============================================================
                    SECTION 7 : Pièces nécessaires
                    ============================================================ */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">Pièces nécessaires</h3>
                  
                  {/* Formulaire d'ajout de pièce */}
                  <div className="flex gap-2 mb-3">
                    {/* Sélection du produit */}
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
                    
                    {/* Quantité */}
                    <input
                      type="number"
                      min="1"
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) })}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Qté"
                    />
                    
                    {/* Bouton Ajouter */}
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Ajouter
                    </button>
                  </div>
                  
                  {/* Liste des pièces ajoutées */}
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
                                {/* Bouton Supprimer la pièce */}
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

                {/* ============================================================
                    SECTION 8 : Notes
                    ============================================================ */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes complémentaires..."
                  />
                </div>

                {/* ============================================================
                    BOUTONS D'ACTION
                    ============================================================ */}
                <div className="flex justify-end gap-3 mt-6">
                  {/* Bouton Annuler */}
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                  
                  {/* Bouton Créer/Mettre à jour */}
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

      {/* ====================================================================
          MODAL - Détails de la réparation (lecture seule)
          ==================================================================== */}
      {showDetailModal && selectedRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Détails de la réparation</h2>

              {/* Référence et Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Référence</p>
                  <p className="font-semibold">{selectedRepair.reference_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Client</p>
                  <p>{getClientFullName(selectedRepair.client_info || selectedRepair.client)}</p>
                </div>
              </div>

              {/* Magasin et Statut */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Magasin</p>
                  <p>{storeLabels[selectedRepair.store]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Statut</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[selectedRepair.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {statusConfig[selectedRepair.status]?.label || selectedRepair.status}
                  </span>
                </div>
              </div>

              {/* Vélo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Produit déposé</p>
                  <p>{selectedRepair.bike_brand}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Modèle</p>
                  <p>{selectedRepair.bike_model || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">N° de série</p>
                  <p>{selectedRepair.bike_serial_number || '-'}</p>
                </div>
              </div>

              {/* Priorité et Coûts */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Priorité</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${priorityConfig[selectedRepair.priority]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {priorityConfig[selectedRepair.priority]?.label || selectedRepair.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Budget MAX</p>
                  <p>{selectedRepair.max_budget ? `${selectedRepair.max_budget}€` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Coût estimé</p>
                  <p>{selectedRepair.estimated_cost ? `${selectedRepair.estimated_cost}€` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Coût final</p>
                  <p>{selectedRepair.final_cost ? `${selectedRepair.final_cost}€` : '-'}</p>
                </div>
              </div>

              {/* Description */}
              {selectedRepair.description && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{selectedRepair.description}</p>
                </div>
              )}

              {/* Diagnostic */}
              {selectedRepair.diagnosis && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Diagnostic</p>
                  <p className="text-gray-700">{selectedRepair.diagnosis}</p>
                </div>
              )}

              {/* Pièces nécessaires */}
              {selectedRepair.parts_needed && selectedRepair.parts_needed.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Pièces nécessaires</p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
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
                </div>
              )}

              {/* Notes */}
              {selectedRepair.notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-700">{selectedRepair.notes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Date de création</p>
                  <p>{selectedRepair.created_at ? new Date(selectedRepair.created_at).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Livraison estimée</p>
                  <p>{selectedRepair.estimated_completion ? new Date(selectedRepair.estimated_completion).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Livraison réelle</p>
                  <p>{selectedRepair.actual_completion ? new Date(selectedRepair.actual_completion).toLocaleDateString('fr-FR') : '-'}</p>
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

      {/* ====================================================================
          NOTIFICATION TOAST
          ==================================================================== */}
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
