import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Dashboard } from "../pages/Dashboard";
import { Bookings } from "../pages/Bookings";
import { Fleet } from "../pages/Fleet";
import { Clients } from "../pages/Clients";
import { AgentCommissions } from "../pages/AgentCommissions";
import { Insurance } from "../pages/Insurance";
import { Agents } from "../pages/Agents";
import { Settings } from "../pages/Settings";
import { Login } from "../pages/Login";
import { Expenses } from "../pages/Expenses";
import { ProtectedAdminRoute } from "../components/routes/ProtectedAdminRoute";
import AgentCommissionView from "../pages/AgentCommissionView";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <Bookings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/fleet"
        element={
          <ProtectedRoute>
            <Fleet />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />

      <Route
        path="/agents"
        element={
          <ProtectedAdminRoute>
            <Agents />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/commissions"
        element={
          <ProtectedAdminRoute>
            <AgentCommissions />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-commissions"
        element={
          <ProtectedRoute>
            <AgentCommissionView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/insurance"
        element={
          <ProtectedRoute>
            <Insurance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
