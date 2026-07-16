import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

// Customer Pages
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerBookings from './pages/CustomerBookings';

// Supplier Pages
import SupplierDashboard from './pages/SupplierDashboard';
import SupplierInventory from './pages/SupplierInventory';
import SupplierRequests from './pages/SupplierRequests';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminModeration from './pages/AdminModeration';
import AdminUsers from './pages/AdminUsers';

// Chat Page
import Chat from './pages/Chat';

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: '#0b0f19', color: '#fff' }}>
        <div className="badge badge-warning" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
          Verifying Portal Access...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile?.user_type)) {
    // Role not authorized, redirect to their home dashboard
    if (profile?.user_type === 'admin') return <Navigate to="/admin" replace />;
    if (profile?.user_type === 'supplier') return <Navigate to="/supplier" replace />;
    return <Navigate to="/customer" replace />;
  }

  return children;
}

// Redirect path based on user login state & role
function HomeRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: '#0b0f19', color: '#fff' }}>
        <div className="badge badge-warning" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
          Configuring Dashboard Workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.user_type === 'admin') return <Navigate to="/admin" replace />;
  if (profile?.user_type === 'supplier') return <Navigate to="/supplier" replace />;
  return <Navigate to="/customer" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer Dashboard Area */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/bookings"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerBookings />
              </ProtectedRoute>
            }
          />

          {/* Supplier Dashboard Area */}
          <Route
            path="/supplier"
            element={
              <ProtectedRoute allowedRoles={['supplier']}>
                <SupplierDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/inventory"
            element={
              <ProtectedRoute allowedRoles={['supplier']}>
                <SupplierInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/requests"
            element={
              <ProtectedRoute allowedRoles={['supplier']}>
                <SupplierRequests />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard Area */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/moderate"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminModeration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* Universal Shared Chat Route */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={['customer', 'supplier', 'admin']}>
                <Chat />
              </ProtectedRoute>
            }
          />

          {/* Landing & Fallback Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
