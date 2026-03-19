import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'vendeur',
    store_access: 'both',
    can_manage_users: false,
    can_view_all_stores: false,
    can_manage_products: false,
    can_manage_clients: false,
    can_view_analytics: false
  });

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setError(null);
      const response = await authAPI.getAllUsers();
      setUsers(response.data.results || response.data);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setError('Impossible de charger les utilisateurs');
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await authAPI.createUser(newUser);
      toast.success('Utilisateur créé avec succès');
      setNewUser({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'vendeur',
        store_access: 'both',
        can_manage_users: false,
        can_view_all_stores: false,
        can_manage_products: false,
        can_manage_clients: false,
        can_view_analytics: false
      });
      setShowCreateForm(false);
      loadUsers();
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      await authAPI.updateUserPermissions(userId, permissions);
      toast.success('Permissions mises à jour');
      setShowPermissionsModal(false);
      loadUsers();
    } catch (error) {
      console.error('Erreur mise à jour permissions:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const canManageUsers = currentUser?.permissions?.can_manage_users;

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement des utilisateurs..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadUsers} />;
  }

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Accès refusé</h3>
          <p className="text-red-600 mt-1">Vous n'avez pas la permission de gérer les utilisateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gérez les accès et permissions de votre équipe</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Ajouter un utilisateur
        </button>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Magasin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user.first_name?.[0] || user.username?.[0] || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'manager' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrateur' :
                     user.role === 'manager' ? 'Gérant' : 'Vendeur'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.store_access === 'both' ? 'Les deux magasins' :
                   user.store_access === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {user.can_manage_users && <span className="px-1 py-0.5 bg-red-100 text-red-700 text-xs rounded">Users</span>}
                    {user.can_view_all_stores && <span className="px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Stores</span>}
                    {user.can_manage_products && <span className="px-1 py-0.5 bg-green-100 text-green-700 text-xs rounded">Products</span>}
                    {user.can_manage_clients && <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Clients</span>}
                    {user.can_view_analytics && <span className="px-1 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Analytics</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowPermissionsModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal création utilisateur */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nouvel Utilisateur</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom d'utilisateur</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prénom</label>
                  <input
                    type="text"
                    required
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <input
                    type="text"
                    required
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rôle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="vendeur">Vendeur</option>
                  <option value="manager">Gérant</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Accès magasin</label>
                <select
                  value={newUser.store_access}
                  onChange={(e) => setNewUser({...newUser, store_access: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="both">Les deux magasins</option>
                  <option value="ville_avray">Ville d'Avray</option>
                  <option value="garches">Garches</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
