import React from "react";
import { NavLink, redirect } from "react-router-dom";
import {
  X,
  LayoutDashboard,
  Calendar,
  Car,
  Users,
  FileText,
  Settings,
  LogOut,
  DollarSign,
  UserCircle,
  TrendingDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  // Check if user is admin - we use a simple string comparison for role
  const userIsAdmin = user?.role === "admin";

  const handleLogout = () => {
    logout();
    redirect("/login");
    onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">{t("branding.appName")}</span>
        </div>
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={onClose}
            >
              <LayoutDashboard size={20} />
              <span>{t("nav.dashboard")}</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/bookings"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={onClose}
            >
              <Calendar size={20} />
              <span>{t("nav.bookings")}</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/fleet"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={onClose}
            >
              <Car size={20} />
              <span>{t("nav.fleet")}</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/clients"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={onClose}
            >
              <Users size={20} />
              <span>{t("nav.clients")}</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/expenses"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={onClose}
            >
              <TrendingDown size={20} />
              <span>{t("nav.expenses")}</span>
            </NavLink>
          </li>
          {userIsAdmin && (
            <>
              <li className="nav-item">
                <NavLink
                  to="/agents"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={onClose}
                >
                  <UserCircle size={20} />
                  <span>{t("nav.agents")}</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/commissions"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={onClose}
                >
                  <DollarSign size={20} />
                  <span>{t("nav.commissions")}</span>
                </NavLink>
              </li>
            </>
          )}
          {!userIsAdmin && (
            <li className="nav-item">
              <NavLink
                to="/my-commissions"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
                onClick={onClose}
              >
                <DollarSign size={20} />
                <span>{t("nav.myCommissions")}</span>
              </NavLink>
            </li>
          )}
          <li className="nav-item">
            <NavLink
              to="/insurance"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={onClose}
            >
              <FileText size={20} />
              <span>{t("nav.insurance")}</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          onClick={onClose}
        >
          <Settings size={20} />
          <span>{t("nav.settings")}</span>
        </NavLink>

        <button className="nav-link logout-button" onClick={handleLogout}>
          <LogOut size={20} />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
};
