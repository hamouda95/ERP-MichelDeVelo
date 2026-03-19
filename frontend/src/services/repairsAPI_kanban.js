/**
 * API spécialisée pour le workflow Kanban des réparations
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

export const repairsKanbanAPI = {
  // Obtenir les réparations organisées par statut
  getRepairsByStatus: async (filters = {}) => {
    try {
      const response = await api.get('/repairs/repairs/', { params: filters });
      const repairs = response.data.results || response.data;
      
      // Organiser par statut
      const organized = {
        pending: [],
        diagnosis: [],
        waiting_parts: [],
        in_progress: [],
        testing: [],
        completed: [],
        delivered: [],
        cancelled: []
      };
      
      repairs.forEach(repair => {
        if (organized[repair.status]) {
          organized[repair.status].push({
            ...repair,
            // Ajouter les URLs des photos si disponibles
            photo_1_url: repair.photo_1 ? `${API_URL.replace('/api', '')}${repair.photo_1}` : null,
            photo_2_url: repair.photo_2 ? `${API_URL.replace('/api', '')}${repair.photo_2}` : null,
            photo_3_url: repair.photo_3 ? `${API_URL.replace('/api', '')}${repair.photo_3}` : null,
          });
        }
      });
      
      return organized;
    } catch (error) {
      console.error('Erreur lors du chargement des réparations:', error);
      throw error;
    }
  },

  // Mise à jour rapide du statut (pour le drag & drop)
  updateStatus: async (repairId, statusData) => {
    try {
      const response = await api.post(`/repairs/repairs/${repairId}/update_status/`, statusData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  },

  // Obtenir les statistiques du workflow
  getWorkflowStats: async () => {
    try {
      const response = await api.get('/repairs/repairs/statistics/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      throw error;
    }
  },

  // Créer une réparation rapide (pour le Kanban)
  quickCreate: async (repairData) => {
    try {
      const formData = new FormData();
      
      // Ajouter les champs texte
      Object.keys(repairData).forEach(key => {
        if (key !== 'photos') {
          formData.append(key, repairData[key]);
        }
      });

      // Ajouter les photos
      if (repairData.photos) {
        repairData.photos.forEach((photo, index) => {
          if (photo) {
            formData.append(`photo_${index + 1}`, photo);
          }
        });
      }

      const response = await api.post('/repairs/repairs/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la réparation:', error);
      throw error;
    }
  },

  // Obtenir les pièces d'une réparation
  getRepairParts: async (repairId) => {
    try {
      const response = await api.get(`/repairs/repair-items/?repair=${repairId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement des pièces:', error);
      throw error;
    }
  },

  // Ajouter une pièce à une réparation
  addRepairPart: async (repairId, partData) => {
    try {
      const response = await api.post(`/repairs/repairs/${repairId}/add_item/`, partData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la pièce:', error);
      throw error;
    }
  },

  // Supprimer une pièce
  deleteRepairPart: async (partId) => {
    try {
      await api.delete(`/repairs/repair-items/${partId}/`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la pièce:', error);
      throw error;
    }
  },

  // Marquer une pièce comme commandée
  markPartOrdered: async (partId) => {
    try {
      const response = await api.post(`/repairs/repair-items/${partId}/mark_ordered/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du marquage de la pièce:', error);
      throw error;
    }
  },

  // Marquer une pièce comme reçue
  markPartReceived: async (partId) => {
    try {
      const response = await api.post(`/repairs/repair-items/${partId}/mark_received/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du marquage de la pièce:', error);
      throw error;
    }
  },

  // Obtenir le timeline d'une réparation
  getRepairTimeline: async (repairId) => {
    try {
      const response = await api.get(`/repairs/repairs/${repairId}/timeline/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement du timeline:', error);
      throw error;
    }
  },

  // Ajouter une entrée au timeline
  addTimelineEntry: async (repairId, timelineData) => {
    try {
      const response = await api.post(`/repairs/repairs/${repairId}/add_timeline/`, timelineData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout au timeline:', error);
      throw error;
    }
  },

  // Uploader un document
  uploadDocument: async (repairId, documentData) => {
    try {
      const formData = new FormData();
      Object.keys(documentData).forEach(key => {
        formData.append(key, documentData[key]);
      });

      const response = await api.post(`/repairs/repairs/${repairId}/upload_document/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload du document:', error);
      throw error;
    }
  },

  // Générer un devis PDF
  generateQuote: async (repairId) => {
    try {
      const response = await api.get(`/repairs/repairs/${repairId}/print_quote/`, { 
        responseType: 'blob' 
      });
      
      // Créer une URL pour le blob
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      return {
        url,
        blob,
        filename: `devis_${repairId}.pdf`
      };
    } catch (error) {
      console.error('Erreur lors de la génération du devis:', error);
      throw error;
    }
  },

  // Mises à jour en lot (pour les actions groupées)
  bulkUpdateStatus: async (repairIds, statusData) => {
    try {
      const response = await api.post('/repairs/repairs/bulk_update_status/', {
        repair_ids: repairIds,
        ...statusData
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour groupée:', error);
      throw error;
    }
  },

  // Recherche avancée
  searchRepairs: async (query, filters = {}) => {
    try {
      const response = await api.get('/repairs/repairs/', {
        params: { search: query, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      throw error;
    }
  }
};

export default repairsKanbanAPI;
