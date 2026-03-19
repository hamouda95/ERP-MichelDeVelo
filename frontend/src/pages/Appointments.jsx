import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [filter, setFilter] = useState({
    source: 'all', // all, local, wix
    status: 'all',
    date: 'all'
  });

  // Charger les rendez-vous depuis notre API
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const params = new URLSearchParams();
      if (filter.source !== 'all') params.append('source', filter.source);
      if (filter.status !== 'all') params.append('status', filter.status);
      
      const response = await fetch(`${API_BASE_URL}/appointments/?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      } else {
        throw new Error('Erreur lors du chargement des rendez-vous');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous :', error);
      toast.error('Impossible de charger les rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  // Synchroniser avec Wix
  const syncWithWix = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE_URL}/appointments/sync-wix/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Synchronisation réussie : ${result.created} créés, ${result.updated} mis à jour`);
        await fetchAppointments(); // Recharger les données
        await fetchSyncStatus(); // Mettre à jour le statut
      } else {
        throw new Error(result.error || 'Erreur lors de la synchronisation');
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation Wix :', error);
      toast.error(error.message || 'Échec de la synchronisation Wix');
    } finally {
      setSyncing(false);
    }
  };

  // Récupérer le statut de la dernière synchronisation
  const fetchSyncStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE_URL}/appointments/sync-status/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.last_sync);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du statut de sync :', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchSyncStatus();
  }, [filter]);

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Formater l'heure
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no_show': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status) => {
    const labels = {
      'scheduled': 'Planifié',
      'confirmed': 'Confirmé',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'no_show': 'Absent',
    };
    return labels[status] || status;
  };

  // Obtenir le libellé du type
  const getTypeLabel = (type) => {
    const labels = {
      'repair': 'Réparation',
      'maintenance': 'Entretien',
      'customization': 'Personnalisation',
      'delivery': 'Livraison',
      'consultation': 'Consultation',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rendez-vous</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gérez vos rendez-vous et synchronisez avec Wix Bookings
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Statut de synchronisation */}
              {syncStatus && (
                <div className="flex items-center space-x-2 text-sm">
                  {syncStatus.status === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="text-gray-600">
                    Dernière sync: {new Date(syncStatus.date).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
              
              {/* Bouton de synchronisation */}
              <button
                onClick={syncWithWix}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <CloudArrowDownIcon className="-ml-1 mr-2 h-4 w-4" />
                    Synchroniser Wix
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filtres:</span>
            </div>
            
            <select
              value={filter.source}
              onChange={(e) => setFilter({...filter, source: e.target.value})}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">Toutes les sources</option>
              <option value="local">Local uniquement</option>
              <option value="wix">Wix uniquement</option>
            </select>
            
            <select
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="scheduled">Planifié</option>
              <option value="confirmed">Confirmé</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
              <option value="no_show">Absent</option>
            </select>
            
            <button
              onClick={() => setFilter({source: 'all', status: 'all', date: 'all'})}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Liste des rendez-vous */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun rendez-vous</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter.source !== 'all' || filter.status !== 'all' 
                ? 'Essayez de modifier les filtres' 
                : 'Commencez par synchroniser avec Wix ou créez des rendez-vous manuellement'
              }
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <li key={appointment.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <UserIcon className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {appointment.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {appointment.client_name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {appointment.source === 'wix' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Wix
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                              {getStatusLabel(appointment.status)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{formatDate(appointment.appointment_date)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>{formatTime(appointment.appointment_time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {getTypeLabel(appointment.appointment_type)}
                            </span>
                          </div>
                          {appointment.client_phone && (
                            <div className="flex items-center space-x-1">
                              <PhoneIcon className="h-4 w-4" />
                              <span>{appointment.client_phone}</span>
                            </div>
                          )}
                        </div>
                        
                        {appointment.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {appointment.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowDetailModal(true);
                          }}
                          className="font-medium text-blue-600 hover:text-blue-900"
                        >
                          Voir détails
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Détails du rendez-vous
                  </h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Titre</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAppointment.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAppointment.client_name}</p>
                    {selectedAppointment.client_email && (
                      <p className="text-sm text-gray-500">{selectedAppointment.client_email}</p>
                    )}
                    {selectedAppointment.client_phone && (
                      <p className="text-sm text-gray-500">{selectedAppointment.client_phone}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedAppointment.appointment_date)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Heure</label>
                      <p className="mt-1 text-sm text-gray-900">{formatTime(selectedAppointment.appointment_time)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-sm text-gray-900">{getTypeLabel(selectedAppointment.appointment_type)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Statut</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                        {getStatusLabel(selectedAppointment.status)}
                      </span>
                    </div>
                  </div>
                  
                  {selectedAppointment.source === 'wix' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Source</label>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Wix Bookings
                      </span>
                    </div>
                  )}
                  
                  {selectedAppointment.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedAppointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
