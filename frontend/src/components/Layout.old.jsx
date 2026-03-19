import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { 
  HomeIcon, 
  CubeIcon, 
  UserGroupIcon, 
  ShoppingCartIcon, 
  ArrowRightOnRectangleIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  TruckIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation de base
  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, permission: 'can_view_analytics' },
    { name: 'Clients', href: '/clients', icon: UserGroupIcon, permission: 'can_manage_clients' },
    { name: 'Stocks', href: '/products', icon: CubeIcon, permission: 'can_manage_products' },
    { name: 'Caisse', href: '/cart', icon: ShoppingCartIcon, permission: null },
    { name: 'Réparations', href: '/repairs-unified', icon: WrenchScrewdriverIcon, permission: null },
    { name: 'Devis', href: '/quotes', icon: DocumentTextIcon, permission: null },
  ];

  // Navigation étendue pour les gestionnaires
  const managerNavigation = [
    { name: 'Achats', href: '/purchases', icon: TruckIcon, permission: null },
    { name: 'RDV', href: '/appointments', icon: CalendarDaysIcon, permission: null },
    { name: 'Comptabilité', href: '/Finance', icon: CurrencyDollarIcon, permission: 'can_view_analytics' },
  ];

  // Navigation admin uniquement
  const adminNavigation = [
    { name: 'Utilisateurs', href: '/users', icon: UsersIcon, permission: 'can_manage_users' },
  ];

  // Combiner la navigation selon les permissions
  const userPermissions = user?.permissions || {};
  let navigation = [...baseNavigation];

  // Ajouter la navigation manager si admin ou manager
  if (user?.role === 'admin' || user?.role === 'manager') {
    navigation = [...navigation, ...managerNavigation];
  }

  // Ajouter la navigation admin
  if (userPermissions.can_manage_users) {
    navigation = [...navigation, ...adminNavigation];
  }

  // Filtrer les éléments selon les permissions
  const filteredNavigation = navigation.filter(item => {
    if (!item.permission) return true;
    return userPermissions[item.permission] === true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setSidebarOpen(false)}
            style={{ zIndex: 1 }}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg" style={{ zIndex: 2 }}>
            {/* Mobile sidebar content */}
            <div className="h-16 flex items-center justify-between border-b px-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full">
                  <img 
                    src="https://osiuwhudhfsbcpcrukzc.supabase.co/storage/v1/object/sign/Media/michel%20logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMGUwMDIzNy0xNDNjLTRhNjYtYWI5ZC0zNjhjYzdmNTUzMzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJNZWRpYS9taWNoZWwgbG9nby5wbmciLCJpYXQiOjE3NzM4OTQ5OTAsImV4cCI6MjQwNDYxNDk5MH0.y5AeMhEXqA8IUedHgVgdInas98jXbrMXjri69P6xW0E" 
                    alt="Logo Michel De Vélo" 
                    className="w-10 h-10 object-contain rounded-full" 
                  />
                </div>
                <span className="text-xl font-bold text-gray-900">Michel De Vélo</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setSidebarOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full">
              <img 
                src="https://static.wixstatic.com/media/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png/v1/fit/w_2500,h_1330,al_c/985974_816db9a0e3d348da86b214669dbf3d64~mv2.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-full" 
              />
            </div>
            <span className="text-xl font-bold text-gray-900">Michel De Vélo</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {user?.first_name?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name || user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-gray-500">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              
              {/* Mobile user menu */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
