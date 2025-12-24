import React, { useState, useEffect, useCallback } from 'react';
import { clientsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Chargement des clients
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clientsAPI.getAll();
      const clientsData = data.results || data;
      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Filtrage des clients
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = clients.filter((client) =>
      [client.first_name, client.last_name, client.email, client.city]
        .some((field) => field?.toLowerCase().includes(searchLower)) ||
      client.phone?.includes(searchTerm)
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  // Actions CRUD
  const handleAddClient = () => {
    setCurrentClient(null);
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setCurrentClient(client);
    setShowModal(true);
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      await clientsAPI.delete(clientToDelete.id);
      toast.success('Client supprimé avec succès');
      await loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du client');
    } finally {
      setShowDeleteModal(false);
      setClientToDelete(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos clients ({filteredClients.length})
          </p>
        </div>
        <button
          onClick={handleAddClient}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau client
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone ou ville..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Tableau des clients */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'Aucun client trouvé' : 'Aucun client enregistré'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddClient}
                className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
              >
                + Ajouter votre premier client
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Nom complet', 'Email', 'Téléphone', 'Ville', "Date d'inscription", 'Actions'].map((header) => (
                    <th
                      key={header}
                      className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                        header === 'Actions' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {client.first_name?.charAt(0)}
                            {client.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {client.first_name} {client.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.city || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClient(client)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Modifier"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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

      {/* Modales */}
      {showModal && (
        <ClientModal
          client={currentClient}
          onClose={() => {
            setShowModal(false);
            setCurrentClient(null);
          }}
          onSave={() => {
            loadClients();
            setShowModal(false);
            setCurrentClient(null);
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          client={clientToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setClientToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

/* ---------- MODAL D'AJOUT / MODIFICATION CLIENT ---------- */
function ClientModal({ client, onClose, onSave }) {
  const [formData, setFormData] = useState({
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    postal_code: client?.postal_code || '',
    country: client?.country || 'France',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate required fields
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Le prénom est requis';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Le nom est requis';
    }
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Adresse email invalide';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    } else if (!formData.phone.match(/^[0-9\s+()-]+$/)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    } else {
      const digitsOnly = formData.phone.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 10) {
        newErrors.phone = 'Le numéro doit contenir au moins 10 chiffres';
      }
    }

    // Validate postal code if provided
    if (formData.postal_code && !formData.postal_code.match(/^\d{5}$/)) {
      newErrors.postal_code = 'Le code postal doit contenir 5 chiffres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    setLoading(true);
    try {
      // Prepare data - trim all string values
      const dataToSend = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        postal_code: formData.postal_code.trim(),
        country: formData.country.trim(),
      };

      if (client) {
        await clientsAPI.update(client.id, dataToSend);
        toast.success('Client modifié avec succès');
      } else {
        await clientsAPI.create(dataToSend);
        toast.success('Client créé avec succès');
      }
      onSave();
    } catch (error) {
      console.error('Error saving client:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        setErrors(backendErrors);
        
        // Show specific error messages
        if (backendErrors.email) {
          toast.error(Array.isArray(backendErrors.email) ? backendErrors.email[0] : backendErrors.email);
        } else if (backendErrors.phone) {
          toast.error(Array.isArray(backendErrors.phone) ? backendErrors.phone[0] : backendErrors.phone);
        } else {
          toast.error('Erreur de validation. Veuillez vérifier les champs.');
        }
      } else {
        toast.error(
          error.response?.data?.message ||
            `Erreur lors de ${client ? 'la modification' : 'la création'} du client`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {client ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition"
            type="button"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Prénom" 
              name="first_name" 
              value={formData.first_name} 
              onChange={handleChange} 
              required 
              error={errors.first_name}
            />
            <Input 
              label="Nom" 
              name="last_name" 
              value={formData.last_name} 
              onChange={handleChange} 
              required 
              error={errors.last_name}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Email" 
              name="email" 
              type="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              error={errors.email}
            />
            <Input 
              label="Téléphone" 
              name="phone" 
              type="tel" 
              value={formData.phone} 
              onChange={handleChange} 
              required 
              error={errors.phone}
              placeholder="Ex: 01 23 45 67 89"
            />
          </div>

          <Input 
            label="Adresse" 
            name="address" 
            value={formData.address} 
            onChange={handleChange} 
            error={errors.address}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              label="Code postal" 
              name="postal_code" 
              value={formData.postal_code} 
              onChange={handleChange} 
              error={errors.postal_code}
              placeholder="75001"
              maxLength={5}
            />
            <Input 
              label="Ville" 
              name="city" 
              value={formData.city} 
              onChange={handleChange} 
              error={errors.city}
            />
            <Input 
              label="Pays" 
              name="country" 
              value={formData.country} 
              onChange={handleChange} 
              error={errors.country}
            />
          </div>

          <div className="flex gap-4 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </span>
              ) : (
                client ? 'Modifier' : 'Créer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- INPUT RÉUTILISABLE ---------- */
function Input({ label, name, type = 'text', value, onChange, required = false, error = null, placeholder = '', maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition ${
          error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

/* ---------- MODAL SUPPRESSION ---------- */
function DeleteConfirmModal({ client, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <TrashIcon className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Supprimer le client</h3>
        <p className="text-gray-600 text-center mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{client?.first_name} {client?.last_name}</strong> ?<br />
          Cette action est irréversible.
        </p>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Suppression...
              </span>
            ) : (
              'Supprimer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
