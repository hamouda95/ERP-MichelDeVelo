/**
 * ============================================================================ 
 * API SERVICES - RÉPARATIONS
 * ============================================================================ 
 * 
 * Services API pour la gestion des réparations avec toutes les 
 * fonctionnalités du workflow Kanban.
 * 
 * ============================================================================ 
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const repairsAPI = {
  // CRUD de base
  getAll: (params = {}) => api.get('/repairs/repairs/', { params }),
  getById: (id) => api.get(`/repairs/repairs/${id}/`),
  create: (data) => api.post('/repairs/repairs/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.patch(`/repairs/repairs/${id}/`, data),
  delete: (id) => api.delete(`/repairs/repairs/${id}/`),
  
  // Gestion du statut
  updateStatus: (id, statusData) => api.post(`/repairs/repairs/${id}/update_status/`, statusData),
  
  // Gestion des articles/pièces
  addItem: (id, itemData) => api.post(`/repairs/repairs/${id}/add_item/`, itemData),
  getItems: (repairId) => api.get(`/repairs/repair-items/?repair=${repairId}`),
  updateItem: (id, data) => api.patch(`/repairs/repair-items/${id}/`, data),
  deleteItem: (id) => api.delete(`/repairs/repair-items/${id}/`),
  
  // Gestion des pièces
  markPieceOrdered: (id) => api.post(`/repairs/repair-items/${id}/mark_ordered/`),
  markPieceReceived: (id) => api.post(`/repairs/repair-items/${id}/mark_received/`),
  
  // Timeline
  addTimeline: (id, timelineData) => api.post(`/repairs/repairs/${id}/add_timeline/`, timelineData),
  getTimeline: (repairId) => api.get(`/repairs/repairs/${repairId}/timeline/`),
  
  // Documents
  uploadDocument: (id, documentData) => api.post(`/repairs/repairs/${id}/upload_document/`, documentData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDocuments: (repairId) => api.get(`/repairs/repairs/${repairId}/documents/`),
  
  // Impression et PDF
  printQuote: (id) => api.get(`/repairs/repairs/${id}/print_quote/`, { responseType: 'blob' }),
  printInvoice: (id) => api.get(`/repairs/repairs/${id}/print_invoice/`, { responseType: 'blob' }),
  
  // Statistiques et dashboard
  getStatistics: () => api.get('/repairs/repairs/statistics/'),
  getDashboard: () => api.get('/repairs/repairs/dashboard/'),
  
  // Notifications
  sendNotification: (id, notificationData) => api.post(`/repairs/repairs/${id}/send_notification/`, notificationData),
  sendSMS: (id) => api.post(`/repairs/repairs/${id}/send_sms/`),
  
  // Charge de travail de l'atelier
  getWorkload: (params = {}) => api.get('/repairs/workload/', { params }),
  createWorkload: (data) => api.post('/repairs/workload/', data),
  updateWorkload: (id, data) => api.patch(`/repairs/workload/${id}/`, data),
  getWeeklyPlanning: () => api.get('/repairs/workload/weekly_planning/'),
  
  // Recherche avancée
  search: (query, filters = {}) => api.get('/repairs/repairs/', { 
    params: { search: query, ...filters } 
  }),
  
  // Actions groupées
  bulkUpdateStatus: (ids, statusData) => api.post('/repairs/repairs/bulk_update_status/', { 
    repair_ids: ids, 
    ...statusData 
  }),
  
  exportData: (format = 'csv', filters = {}) => api.get('/repairs/repairs/export/', { 
    params: { format, ...filters },
    responseType: 'blob'
  }),
};

export default repairsAPI;
