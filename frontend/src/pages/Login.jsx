import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Utiliser l'email comme identifiant (accepté par notre endpoint custom)
      const response = await authAPI.login({ email, password });
      const { access, user } = response.data;
      
      // Login avec les données utilisateur
      login(user, access);
      
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = "Identifiant ou mot de passe incorrect";
      
      if (error.response?.status === 401) {
        errorMessage = "Identifiant ou mot de passe incorrect";
      } else if (error.response?.status === 500) {
        errorMessage = "Erreur serveur, veuillez réessayer";
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = "Erreur de connexion, vérifiez votre internet";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans bg-[#0d1117]">

      {/* Panneau gauche — identité de marque */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden">
        {/* Halos */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-green-500 opacity-[0.07] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-blue-500 opacity-[0.05] rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="5" cy="14" r="3.5" stroke="white" strokeWidth="1.5" />
              <circle cx="15" cy="14" r="3.5" stroke="white" strokeWidth="1.5" />
              <path d="M5 14L10 6L13 10M10 6L13 4M10 10H15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[#f0f0ec] font-semibold text-[15px] tracking-tight">Michel De Vélo</span>
        </div>

        {/* Accroche */}
        <div className="relative z-10">
          <h2 className="text-[#f0f0ec] text-5xl font-bold leading-[1.1] tracking-tight mb-5">
            Gérez votre<br />atelier{' '}
            <span className="text-green-400">sans friction.</span>
          </h2>
          <p className="text-[rgba(240,240,236,0.5)] text-[15px] leading-relaxed max-w-xs">
            Réparations, caisse, devis, fournisseurs — tout votre workflow en un seul espace.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-10 relative z-10">
          {[
            { num: '1 200+', label: 'Réparations' },
            { num: '98%',    label: 'Satisfaction' },
            { num: '5 min',  label: 'Prise en main' },
          ].map(({ num, label }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[#f0f0ec] text-xl font-semibold tracking-tight">{num}</span>
              <span className="text-[rgba(240,240,236,0.4)] text-[11px] uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>

        {/* Vélo décoratif */}
        <svg className="absolute bottom-[-20px] right-[-40px] opacity-[0.04]" width="400" height="300" viewBox="0 0 400 300" fill="none">
          <circle cx="100" cy="220" r="80" stroke="white" strokeWidth="6" />
          <circle cx="300" cy="220" r="80" stroke="white" strokeWidth="6" />
          <path d="M100 220L200 80L280 160M200 80L250 60M200 160H300" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="200" cy="80" r="12" fill="white" />
        </svg>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="bg-[#f7f6f1] flex items-center justify-center px-8 py-16 lg:px-16">
        <div className="w-full max-w-sm">

          {/* Header mobile only */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="5" cy="14" r="3.5" stroke="white" strokeWidth="1.5" />
                <circle cx="15" cy="14" r="3.5" stroke="white" strokeWidth="1.5" />
                <path d="M5 14L10 6L13 10M10 6L13 4M10 10H15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[#0d1117] font-semibold">Michel De Vélo</span>
          </div>

          <p className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-2">Bienvenue</p>
          <h1 className="text-[#0d1117] text-3xl font-bold tracking-tight mb-2">Connexion</h1>
          <p className="text-[#888880] text-sm mb-10">Accédez à votre espace de gestion.</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Identifiant */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#444440] text-[11px] font-semibold uppercase tracking-wide">
                Identifiant
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email ou nom d'utilisateur"
                  required
                  className="w-full px-3.5 py-3 pr-10 bg-white border border-[#e0dfd6] rounded-[10px] text-[#0d1117] text-sm placeholder-[#c0bfb6] outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-all"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 pointer-events-none" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="6" r="3" stroke="#0d1117" strokeWidth="1.5" />
                  <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="#0d1117" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#444440] text-[11px] font-semibold uppercase tracking-wide">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-3 pr-10 bg-white border border-[#e0dfd6] rounded-[10px] text-[#0d1117] text-sm placeholder-[#c0bfb6] outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-70 transition-opacity"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="#0d1117" strokeWidth="1.5" />
                      <line x1="3" y1="3" x2="13" y2="13" stroke="#0d1117" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="#0d1117" strokeWidth="1.5" />
                      <circle cx="8" cy="8" r="2" stroke="#0d1117" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-[11px] text-green-600 font-medium hover:opacity-70 transition-opacity">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#0d1117] hover:bg-[#1a2332] text-[#f7f6f1] text-sm font-semibold rounded-[10px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-[rgba(247,246,241,0.3)] border-t-[#f7f6f1] animate-spin" />
                  Connexion...
                </>
              ) : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-[#888880] text-[13px] mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-[#0d1117] font-semibold border-b border-green-500 pb-px hover:opacity-70 transition-opacity">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}