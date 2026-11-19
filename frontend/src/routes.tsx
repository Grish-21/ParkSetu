import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { LotDetail } from './pages/LotDetail';
import { BookingForm } from './pages/BookingForm';
import { MyBookings } from './pages/MyBookings';
import { GateSimulator } from './pages/GateSimulator';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { AdminStats } from './pages/admin/AdminStats';
import { ProtectedRoute } from './auth/ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/lots/:id" element={<LotDetail />} />
      <Route path="/gate" element={<GateSimulator />} />

      {/* Driver / Authenticated routes */}
      <Route
        path="/lots/:id/book"
        element={
          <ProtectedRoute>
            <BookingForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />

      {/* Owner route */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminStats />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
