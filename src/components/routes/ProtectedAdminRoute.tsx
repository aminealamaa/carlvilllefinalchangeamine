import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isAdmin } from "../../utils/permissionUtils";
import { toast } from "sonner";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // While checking authentication, show a loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    toast.error("You must be logged in to access this page");
    return <Navigate to="/login" replace />;
  }

  // If user is not an admin, redirect to dashboard with an error message
  if (!isAdmin(user)) {
    toast.error("You don't have permission to access this page");
    return <Navigate to="/dashboard" replace />;
  }

  // If user is authenticated and is an admin, render the children
  return <>{children}</>;
};
