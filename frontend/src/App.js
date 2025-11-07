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
import Clients from './pages/Clients';
import Cart from './pages/Cart';
import Repairs from './pages/Repairs';      // ✅ Nouveau
import Quotes from './pages/Quotes';        // ✅ Nouveau
import Suppliers from './pages/Suppliers';  // ✅ Nouveau
import Appointments from './pages/Appointments';
import Purchases from './pages/Purchases';
import Finance from './pages/Finance';
import Layout from './components/Layout';

// Protection des routes
function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Routes protégées */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/repairs" element={<Repairs />} />      {/* ✅ Nouveau */}
                    <Route path="/quotes" element={<Quotes />} />        {/* ✅ Nouveau */}
                    <Route path="/suppliers" element={<Suppliers />} />  {/* ✅ Nouveau */}
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/purchases" element={<Purchases />} />
                    <Route path="/finance" element={<Finance />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
