/**
 * ============================================================================ 
 * COMPOSANT SETTINGS - PARAMÈTRES DE L'ERP
 * ============================================================================ 
 * 
 * Interface complète pour gérer les paramètres de l'ERP :
 * - Prestations d'atelier (services)
 * - Utilisateurs et leurs rôles
 * - Gestion des permissions par rôle
 * 
 * ============================================================================ 
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cog6ToothIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyEuroIcon,
  ClockIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('services'); // 'services', 'users', 'roles'
  
  // États pour les prestations
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  
  // États pour les utilisateurs
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  
  // États pour les rôles
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // Formulaires
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    price_ttc: '',
    duration_minutes: '',
    category: 'maintenance'
  });
  
  const [userFormData, setUserFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    is_active: true
  });
  
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  // Permissions disponibles
  const availablePermissions = [
    { id: 'view_dashboard', name: 'Voir Dashboard', category: 'general' },
    { id: 'manage_products', name: 'Gérer les produits', category: 'stock' },
    { id: 'manage_clients', name: 'Gérer les clients', category: 'sales' },
    { id: 'manage_sales', name: 'Gérer les ventes', category: 'sales' },
    { id: 'view_sales_history', name: 'Voir l\'historique des ventes', category: 'sales' },
    { id: 'manage_repairs', name: 'Gérer les réparations', category: 'repairs' },
    { id: 'manage_quotes', name: 'Gérer les devis', category: 'sales' },
    { id: 'manage_purchases', name: 'Gérer les achats', category: 'purchases' },
    { id: 'manage_appointments', name: 'Gérer les RDV', category: 'appointments' },
    { id: 'manage_finance', name: 'Gérer la comptabilité', category: 'finance' },
    { id: 'manage_users', name: 'Gérer les utilisateurs', category: 'admin' },
    { id: 'manage_roles', name: 'Gérer les rôles', category: 'admin' },
    { id: 'manage_settings', name: 'Gérer les paramètres', category: 'admin' }
  ];

  // Charger les données
  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      // Simuler l'appel API - remplacer avec le vrai appel
      const mockServices = [
        { id: 1, name: 'Réparation freins', description: 'Changement plaquettes et réglage', price_ttc: 25, duration_minutes: 30, category: 'maintenance' },
        { id: 2, name: 'Révision complète', description: 'Révision annuelle complète', price_ttc: 60, duration_minutes: 60, category: 'maintenance' },
        { id: 3, name: 'Montage pneu', description: 'Changement pneu avant/arrière', price_ttc: 15, duration_minutes: 20, category: 'service' },
        { id: 4, name: 'Dérailleur', description: 'Réglage dérailleur', price_ttc: 20, duration_minutes: 25, category: 'adjustment' }
      ];
      setServices(mockServices);
    } catch (error) {
      toast.error('Erreur lors du chargement des prestations');
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      // Simuler l'appel API
      const mockUsers = [
        { id: 1, first_name: 'Michel', last_name: 'Durand', email: 'michel@bike.fr', phone: '0123456789', role: 'admin', is_active: true },
        { id: 2, first_name: 'Marie', last_name: 'Martin', email: 'marie@bike.fr', phone: '0123456788', role: 'mechanic', is_active: true },
        { id: 3, first_name: 'Jean', last_name: 'Petit', email: 'jean@bike.fr', phone: '0123456787', role: 'seller', is_active: true }
      ];
      setUsers(mockUsers);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      // Simuler l'appel API
      const mockRoles = [
        { id: 1, name: 'admin', description: 'Administrateur complet', permissions: availablePermissions.map(p => p.id) },
        { id: 2, name: 'mechanic', description: 'Mécanicien', permissions: ['view_dashboard', 'manage_repairs', 'manage_products'] },
        { id: 3, name: 'seller', description: 'Vendeur', permissions: ['view_dashboard', 'manage_clients', 'manage_sales', 'view_sales_history'] }
      ];
      setRoles(mockRoles);
    } catch (error) {
      toast.error('Erreur lors du chargement des rôles');
    } finally {
      setLoadingRoles(false);
    }
  }, []); // Suppression de availablePermissions des dépendances

  useEffect(() => {
    loadServices();
    loadUsers();
    loadRoles();
  }, []); // Suppression des dépendances pour éviter la boucle infinie

  // Gestion des prestations
  const openServiceModal = (service = null) => {
    setServiceToEdit(service);
    if (service) {
      setServiceFormData({
        name: service.name,
        description: service.description,
        price_ttc: service.price_ttc,
        duration_minutes: service.duration_minutes,
        category: service.category
      });
    } else {
      setServiceFormData({
        name: '',
        description: '',
        price_ttc: '',
        duration_minutes: '',
        category: 'maintenance'
      });
    }
    setShowServiceModal(true);
  };

  const handleSaveService = async () => {
    try {
      if (serviceToEdit) {
        // Update
        setServices(prev => prev.map(s => 
          s.id === serviceToEdit.id 
            ? { ...s, ...serviceFormData }
            : s
        ));
        toast.success('Prestation mise à jour');
      } else {
        // Create
        const newService = {
          id: Date.now(),
          ...serviceFormData,
          price_ttc: parseFloat(serviceFormData.price_ttc),
          duration_minutes: parseInt(serviceFormData.duration_minutes)
        };
        setServices(prev => [...prev, newService]);
        toast.success('Prestation créée');
      }
      setShowServiceModal(false);
      setServiceToEdit(null);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteService = (service) => {
    if (window.confirm(`Supprimer la prestation "${service.name}" ?`)) {
      setServices(prev => prev.filter(s => s.id !== service.id));
      toast.success('Prestation supprimée');
    }
  };

  // Gestion des utilisateurs
  const openUserModal = (user = null) => {
    setUserToEdit(user);
    if (user) {
      setUserFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active
      });
    } else {
      setUserFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        is_active: true
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      if (userToEdit) {
        setUsers(prev => prev.map(u => 
          u.id === userToEdit.id 
            ? { ...u, ...userFormData }
            : u
        ));
        toast.success('Utilisateur mis à jour');
      } else {
        const newUser = {
          id: Date.now(),
          ...userFormData
        };
        setUsers(prev => [...prev, newUser]);
        toast.success('Utilisateur créé');
      }
      setShowUserModal(false);
      setUserToEdit(null);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteUser = (user) => {
    if (window.confirm(`Supprimer l'utilisateur "${user.first_name} ${user.last_name}" ?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success('Utilisateur supprimé');
    }
  };

  // Gestion des rôles
  const openRoleModal = (role = null) => {
    setRoleToEdit(role);
    if (role) {
      setRoleFormData({
        name: role.name,
        description: role.description,
        permissions: role.permissions
      });
    } else {
      setRoleFormData({
        name: '',
        description: '',
        permissions: []
      });
    }
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    try {
      if (roleToEdit) {
        setRoles(prev => prev.map(r => 
          r.id === roleToEdit.id 
            ? { ...r, ...roleFormData }
            : r
        ));
        toast.success('Rôle mis à jour');
      } else {
        const newRole = {
          id: Date.now(),
          ...roleFormData
        };
        setRoles(prev => [...prev, newRole]);
        toast.success('Rôle créé');
      }
      setShowRoleModal(false);
      setRoleToEdit(null);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteRole = (role) => {
    if (window.confirm(`Supprimer le rôle "${role.name}" ?`)) {
      setRoles(prev => prev.filter(r => r.id !== role.id));
      toast.success('Rôle supprimé');
    }
  };

  const togglePermission = (permissionId) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Cog6ToothIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('services')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'services'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <WrenchScrewdriverIcon className="w-4 h-4" />
                Prestations atelier
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4" />
                Utilisateurs
              </div>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'roles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4" />
                Rôles et permissions
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onglet Prestations */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Prestations d'atelier</h2>
              <button
                onClick={() => openServiceModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                Ajouter une prestation
              </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              {loadingServices ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  Chargement...
                </div>
              ) : services.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <WrenchScrewdriverIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune prestation configurée</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durée
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Catégorie
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {services.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <TagIcon className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{service.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {service.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <CurrencyEuroIcon className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">{service.price_ttc}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ClockIcon className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">{service.duration_minutes} min</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {service.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openServiceModal(service)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service)}
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
          </div>
        )}

        {/* Onglet Utilisateurs */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Utilisateurs de l'ERP</h2>
              <button
                onClick={() => openUserModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                Ajouter un utilisateur
              </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              {loadingUsers ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  Chargement...
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun utilisateur configuré</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Téléphone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rôle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-medium text-blue-600">
                                  {user.first_name[0]}{user.last_name[0]}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {user.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openUserModal(user)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
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
          </div>
        )}

        {/* Onglet Rôles */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Rôles et permissions</h2>
              <button
                onClick={() => openRoleModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                Ajouter un rôle
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Liste des rôles */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rôles existants</h3>
                {loadingRoles ? (
                  <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                    Chargement...
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center text-gray-500">
                    <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun rôle configuré</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          selectedRole?.id === role.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedRole(role)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{role.name}</h4>
                            <p className="text-sm text-gray-500">{role.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {role.permissions.length} permission(s)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRoleModal(role);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(role);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Détails du rôle sélectionné */}
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedRole ? `Permissions : ${selectedRole.name}` : 'Sélectionnez un rôle'}
                </h3>
                {selectedRole ? (
                  <div className="space-y-4">
                    {availablePermissions.reduce((acc, permission) => {
                      const category = acc[permission.category] || [];
                      category.push(permission);
                      acc[permission.category] = category;
                      return acc;
                    }, {})}
                    
                    {Object.entries(
                      availablePermissions.reduce((acc, permission) => {
                        const category = acc[permission.category] || [];
                        category.push(permission);
                        acc[permission.category] = category;
                        return acc;
                      }, {})
                    ).map(([category, permissions]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                          {category === 'general' ? 'Général' : 
                           category === 'stock' ? 'Stock' :
                           category === 'sales' ? 'Ventes' :
                           category === 'repairs' ? 'Réparations' :
                           category === 'purchases' ? 'Achats' :
                           category === 'appointments' ? 'RDV' :
                           category === 'finance' ? 'Finance' :
                           category === 'admin' ? 'Administration' : category}
                        </h4>
                        <div className="space-y-1">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className={`p-2 rounded text-sm ${
                                selectedRole.permissions.includes(permission.id)
                                  ? 'bg-green-50 text-green-800 border border-green-200'
                                  : 'bg-gray-50 text-gray-500 border border-gray-200'
                              }`}
                            >
                              <div className="flex items-center">
                                {selectedRole.permissions.includes(permission.id) ? (
                                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                                ) : (
                                  <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                                )}
                                {permission.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <ShieldCheckIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sélectionnez un rôle pour voir ses permissions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modale Prestation */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {serviceToEdit ? 'Modifier la prestation' : 'Ajouter une prestation'}
                </h3>
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la prestation
                  </label>
                  <input
                    type="text"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Réparation freins"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Description détaillée de la prestation"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix TTC (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={serviceFormData.price_ttc}
                      onChange={(e) => setServiceFormData(prev => ({ ...prev, price_ttc: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="25.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durée (minutes)
                    </label>
                    <input
                      type="number"
                      value={serviceFormData.duration_minutes}
                      onChange={(e) => setServiceFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={serviceFormData.category}
                    onChange={(e) => setServiceFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="repair">Réparation</option>
                    <option value="service">Service</option>
                    <option value="adjustment">Ajustement</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveService}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {serviceToEdit ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Utilisateur */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {userToEdit ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={userFormData.first_name}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Prénom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={userFormData.last_name}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nom"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@exemple.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner un rôle</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userFormData.is_active}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Compte actif</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {userToEdit ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Rôle */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {roleToEdit ? 'Modifier le rôle' : 'Ajouter un rôle'}
                </h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rôle
                  </label>
                  <input
                    type="text"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: mechanic"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows="2"
                    placeholder="Description du rôle et de ses responsabilités"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {Object.entries(
                      availablePermissions.reduce((acc, permission) => {
                        const category = acc[permission.category] || [];
                        category.push(permission);
                        acc[permission.category] = category;
                        return acc;
                      }, {})
                    ).map(([category, permissions]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-gray-700 mb-1 capitalize">
                          {category === 'general' ? 'Général' : 
                           category === 'stock' ? 'Stock' :
                           category === 'sales' ? 'Ventes' :
                           category === 'repairs' ? 'Réparations' :
                           category === 'purchases' ? 'Achats' :
                           category === 'appointments' ? 'RDV' :
                           category === 'finance' ? 'Finance' :
                           category === 'admin' ? 'Administration' : category}
                        </h4>
                        <div className="space-y-1">
                          {permissions.map((permission) => (
                            <label key={permission.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={roleFormData.permissions.includes(permission.id)}
                                onChange={() => togglePermission(permission.id)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">{permission.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {roleToEdit ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
