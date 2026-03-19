/**
 * ============================================================================ 
 * API SERVICES - SERVICES DE L'ERP
 * ============================================================================ 
 * 
 * Services API pour la gestion des paramètres :
 * - Prestations d'atelier
 * - Utilisateurs et rôles
 * - Permissions
 * 
 * ============================================================================ 
 */

import axios from 'axios';

// Configuration axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  const token = authStorage ? JSON.parse(authStorage)?.state?.token : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// SERVICES API - PRESTATIONS
// ============================================

export const servicesAPI = {
  // Récupérer toutes les prestations
  getAll: (params) => api.get('/services/', { params }),
  
  // Récupérer une prestation par son ID
  getById: (id) => api.get(`/services/${id}/`),
  
  // Créer une nouvelle prestation
  create: (data) => api.post('/services/', data),
  
  // Mettre à jour une prestation
  update: (id, data) => api.patch(`/services/${id}/`, data),
  
  // Supprimer une prestation
  delete: (id) => api.delete(`/services/${id}/`),
  
  // Récupérer les prestations par catégorie
  getByCategory: (category) => api.get('/services/', { params: { category } }),
};

// ============================================
// UTILISATEURS API
// ============================================

export const usersAPI = {
  // Récupérer tous les utilisateurs
  getAll: (params) => api.get('/users/', { params }),
  
  // Récupérer un utilisateur par son ID
  getById: (id) => api.get(`/users/${id}/`),
  
  // Créer un nouvel utilisateur
  create: (data) => api.post('/users/', data),
  
  // Mettre à jour un utilisateur
  update: (id, data) => api.patch(`/users/${id}/`, data),
  
  // Supprimer un utilisateur
  delete: (id) => api.delete(`/users/${id}/`),
  
  // Activer/Désactiver un utilisateur
  toggleActive: (id) => api.patch(`/users/${id}/toggle_active/`),
  
  // Réinitialiser le mot de passe
  resetPassword: (id) => api.post(`/users/${id}/reset_password/`),
  
  // Changer le rôle d'un utilisateur
  changeRole: (id, roleId) => api.patch(`/users/${id}/change_role/`, { role_id: roleId }),
};

// ============================================
// RÔLES API
// ============================================

export const rolesAPI = {
  // Récupérer tous les rôles
  getAll: (params) => api.get('/roles/', { params }),
  
  // Récupérer un rôle par son ID
  getById: (id) => api.get(`/roles/${id}/`),
  
  // Créer un nouveau rôle
  create: (data) => api.post('/roles/', data),
  
  // Mettre à jour un rôle
  update: (id, data) => api.patch(`/roles/${id}/`, data),
  
  // Supprimer un rôle
  delete: (id) => api.delete(`/roles/${id}/`),
  
  // Récupérer les permissions disponibles
  getPermissions: () => api.get('/roles/permissions/'),
  
  // Mettre à jour les permissions d'un rôle
  updatePermissions: (id, permissions) => api.patch(`/roles/${id}/permissions/`, { permissions }),
  
  // Vérifier si un utilisateur a une permission spécifique
  checkPermission: (userId, permission) => api.get(`/users/${userId}/check_permission/`, { params: { permission } }),
};

// ============================================
// PERMISSIONS API
// ============================================

export const permissionsAPI = {
  // Récupérer toutes les permissions disponibles
  getAll: () => api.get('/permissions/'),
  
  // Récupérer les permissions par catégorie
  getByCategory: (category) => api.get('/permissions/', { params: { category } }),
  
  // Récupérer les permissions d'un utilisateur
  getUserPermissions: (userId) => api.get(`/users/${userId}/permissions/`),
  
  // Récupérer les permissions d'un rôle
  getRolePermissions: (roleId) => api.get(`/roles/${roleId}/permissions/`),
};

export default api;
