import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { User, Settings, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import "./UserMenu.css";

export const UserMenu = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  // Get user role display text with proper fallback
  const getUserRoleDisplay = () => {
    if (!user || !user.role) return "User";

    return user.role || "User";
  };

  return (
    <div className="user-menu">
      <div className="user-info">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="user-menu-avatar" />
        ) : (
          <div className="user-menu-avatar-placeholder">
            <User size={24} />
          </div>
        )}
        <div className="user-details">
          <p className="user-name">{user?.name || "Guest"}</p>
          <p className="user-role">{getUserRoleDisplay()}</p>
        </div>
      </div>

      <div className="user-menu-divider"></div>

      <ul className="user-menu-list">
        <li>
          <Link to="/profile" className="user-menu-link">
            <User size={18} />
            <span>{t("header.profile")}</span>
          </Link>
        </li>
        <li>
          <Link to="/settings" className="user-menu-link">
            <Settings size={18} />
            <span>{t("header.settings")}</span>
          </Link>
        </li>
        <li>
          <Link to="/help" className="user-menu-link">
            <HelpCircle size={18} />
            <span>{t("header.help")}</span>
          </Link>
        </li>
      </ul>

      <div className="user-menu-divider"></div>

      <button className="user-menu-logout" onClick={logout}>
        <LogOut size={18} />
        <span>{t("header.logout")}</span>
      </button>
    </div>
  );
};
