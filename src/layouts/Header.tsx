import React from "react";
import { useTranslation } from "react-i18next";
import { Menu, Search, Bell, Sun, Moon, User } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { NotificationDropdown } from "../components/notifications/NotificationDropdown";
import { UserMenu } from "../components/user/UserMenu";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import "./Header.css";

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { unreadCount } = useNotifications();

  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu((prev) => !prev);
    setShowNotifications(false);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick} aria-label="Menu">
          <Menu size={24} />
        </button>

        <div className="logo">
          <span className="logo-text">{t("branding.appName")}</span>
        </div>
      </div>

      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={t("header.search")}
        />
      </div>

      <div className="header-right">
        <LanguageSwitcher />

        <button
          className="header-icon-button"
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div className="notification-container">
          <button
            className="header-icon-button notification-button"
            onClick={toggleNotifications}
            aria-label={t("header.notifications")}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && <NotificationDropdown />}
        </div>

        {isAuthenticated && user && (
          <div className="user-container">
            <button
              className="user-button"
              onClick={toggleUserMenu}
              aria-label={t("header.profile")}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="user-avatar"
                />
              ) : (
                <User size={20} />
              )}
            </button>

            {showUserMenu && <UserMenu />}
          </div>
        )}
      </div>
    </header>
  );
};
