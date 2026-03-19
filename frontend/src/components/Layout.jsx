/**
 * LAYOUT MODERNE - VERSION FUSIONNÉE
 * Hamburger fusionné avec la sidebar
 */

import React, { useState, useEffect, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { 
  HomeIcon, 
  CubeIcon, 
  ShoppingCartIcon, 
  ArrowRightOnRectangleIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  TruckIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

export default memo(function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Effet de scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simuler des notifications
  useEffect(() => {
    const mockNotifications = [
      { id: 1, message: 'Stock faible pour Chambre à air 700x25c', type: 'warning', time: 'Il y a 5 min' },
      { id: 2, message: 'Nouveau client enregistré', type: 'success', time: 'Il y a 1h' },
      { id: 3, message: 'Réparation terminée - Vélo de Jean Dupont', type: 'info', time: 'Il y a 2h' }
    ];
    setNotifications(mockNotifications);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation avec badges
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, badge: null },
    { name: 'Stocks', href: '/products', icon: CubeIcon, badge: '3' }, // Stock faible
    { name: 'Caisse', href: '/cashier', icon: ShoppingCartIcon, badge: null },
    { name: 'Réparations', href: '/repairs', icon: WrenchScrewdriverIcon, badge: '2' }, // En attente
    { name: 'Devis', href: '/quotes', icon: DocumentTextIcon, badge: null },
    { name: 'Achats', href: '/purchases', icon: TruckIcon, badge: null },
    { name: 'RDV', href: '/appointments', icon: CalendarDaysIcon, badge: '5' }, // Aujourd'hui
    { name: 'Comptabilité', href: '/finance', icon: CurrencyDollarIcon, badge: null },
    { name: 'Paramètres', href: '/settings', icon: Cog6ToothIcon, badge: null },
  ];

  const getNotificationColor = (type) => {
    switch(type) {
      case 'warning': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-50 text-green-800 border-green-200';
      case 'info': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl">
            {/* Header mobile */}
            <div className="h-16 flex items-center justify-between border-b px-4 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <img 
                    src="https://static.wixstatic.com/media/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png/v1/fit/w_2500,h_1330,al_c/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png" 
                    alt="Logo" 
                    className="w-6 h-6 object-contain" 
                  />
                </div>
                <span className="text-base font-bold text-white">Michel De Vélo</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation mobile */}
            <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User section mobile */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar - FUSIONNÉE avec hamburger */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200 z-40 transition-transform duration-300 ease-in-out transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } hidden lg:block`}
      >
        {/* Header desktop */}
        <div className="h-16 flex items-center justify-between border-b px-6 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <img 
                src="https://static.wixstatic.com/media/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png/v1/fit/w_2500,h_1330,al_c/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png" 
                alt="Logo" 
                className="w-6 h-6 object-contain" 
              />
            </div>
            <span className="text-base font-bold text-white">Michel De Vélo</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation desktop */}
        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  {item.name}
                </div>
                {item.badge && (
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {user?.first_name?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        {/* Top bar améliorée */}
        <div className={`h-16 flex items-center justify-between px-4 lg:px-6 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white shadow-lg border-b border-gray-200' 
            : 'bg-transparent'
        }`}>
          {/* Hamburger pour ouvrir */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isScrolled 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } shadow-md hover:shadow-lg`}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center gap-4">
            {/* Date et heure */}
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <BellIcon className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
              
              {/* Dropdown notifications */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`p-4 border-b ${getNotificationColor(notif.type)}`}>
                        <p className="text-sm font-medium">{notif.message}</p>
                        <p className="text-xs opacity-75 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Voir toutes les notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profil utilisateur */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500">Administrateur</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
});
