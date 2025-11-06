import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../services/api';
//import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Obtenir le token JWT
      const response = await authAPI.login({ username: email, password });
      const { access } = response.data;
      
      // 2. Récupérer les infos de l'utilisateur avec le token
      //const userResponse = await axios.get('http://localhost:8000/api/auth/me/', {
      const userResponse = await axios.get(' https://erp-micheldevelo.onrender.com/api/auth/me/', {
        headers: {
          Authorization: `Bearer ${access}`
        }
      });
      
      const user = userResponse.data;
      
      // 3. Sauvegarder dans le store
      login(user, access);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur:', error.response?.data);
      toast.error('Nom d\'utilisateur ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };
/*
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      const { access, user } = response.data;
      
      login(user, access);
      toast.success('Connexion avec Google réussie !');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erreur de connexion avec Google');
    }
  };
*/
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4">
            <img src="https://static.wixstatic.com/media/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png/v1/fit/w_2500,h_1330,al_c/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png" alt="Logo" className="w-16 h-16 object-contain rounded-full" />
          </div>


          <h1 className="text-3xl font-bold text-gray-900">Michel De Vélo</h1>
          <p className="text-gray-600 mt-2">Connexion à votre espace</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom d'utilisateur ou Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="username ou email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {/* Inscription */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
