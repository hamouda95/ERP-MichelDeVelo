import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';

// Critical components - loaded immediately
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Layout from './components/Layout';

// Lazy loaded components - loaded on demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const CashRegister = lazy(() => import('./pages/CashRegister'));
const RepairsModule = lazy(() => import('./modules/RepairsModule'));
const Quotes = lazy(() => import('./pages/Quotes'));
const SuppliersModule = lazy(() => import('./modules/SuppliersModule'));
const OrderManagement = lazy(() => import('./pages/OrderManagement'));
const ReceptionManagement = lazy(() => import('./pages/ReceptionManagement'));
const PurchaseManagement = lazy(() => import('./pages/PurchaseManagement'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Finance = lazy(() => import('./pages/Finance'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading component for lazy routes
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Protection des routes
function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
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
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/products" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Products />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/cashier" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <CashRegister />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/repairs" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <RepairsModule />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/repairs/:id" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <RepairsModule />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/quotes" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Quotes />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/suppliers" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <SuppliersModule />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/orders" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <OrderManagement />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/receptions" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <ReceptionManagement />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/purchases" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <SuppliersModule />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/appointments" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Appointments />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/finance" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Finance />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Settings />
              </Suspense>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
