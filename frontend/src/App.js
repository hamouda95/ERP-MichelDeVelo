import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './store';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import CashRegister from './pages/CashRegister';
import RepairsModule from './modules/RepairsModule';
import Quotes from './pages/Quotes';
import SuppliersModule from './modules/SuppliersModule';
import OrderManagement from './pages/OrderManagement';
import ReceptionManagement from './pages/ReceptionManagement';
import PurchaseManagement from './pages/PurchaseManagement';
import Appointments from './pages/Appointments';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import Layout from './components/Layout';

// Protection des routes
function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  // Vérifier si Google OAuth est configuré
  const isGoogleOAuthConfigured = process.env.REACT_APP_GOOGLE_CLIENT_ID && process.env.REACT_APP_GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID';

  return (
    <>
      {isGoogleOAuthConfigured ? (
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </Router>
        </GoogleOAuthProvider>
      ) : (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      )}
    </>
  );
}

function AppContent() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Layout><Products /></Layout></PrivateRoute>} />
        <Route path="/cashier" element={<PrivateRoute><Layout><CashRegister /></Layout></PrivateRoute>} />
        <Route path="/repairs" element={<PrivateRoute><Layout><RepairsModule /></Layout></PrivateRoute>} />
        <Route path="/repairs/:id" element={<PrivateRoute><Layout><RepairsModule /></Layout></PrivateRoute>} />
        <Route path="/quotes" element={<PrivateRoute><Layout><Quotes /></Layout></PrivateRoute>} />
        <Route path="/suppliers" element={<PrivateRoute><Layout><SuppliersModule /></Layout></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Layout><OrderManagement /></Layout></PrivateRoute>} />
        <Route path="/receptions" element={<PrivateRoute><Layout><ReceptionManagement /></Layout></PrivateRoute>} />
        <Route path="/purchases" element={<PrivateRoute><Layout><SuppliersModule /></Layout></PrivateRoute>} />
        <Route path="/appointments" element={<PrivateRoute><Layout><Appointments /></Layout></PrivateRoute>} />
        <Route path="/finance" element={<PrivateRoute><Layout><Finance /></Layout></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
