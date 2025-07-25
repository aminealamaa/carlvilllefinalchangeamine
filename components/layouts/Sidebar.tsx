'use client'

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useAuth } from "@/contexts/AuthContext";
import "@/layouts/Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  // Check if user is admin - we use a simple string comparison for role
  const userIsAdmin = user?.role === "admin";

  const handleLogout = () => {
    logout();
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
            <Link
              href="/"
              className={pathname === "/" ? "nav-link active" : "nav-link"}
              onClick={onClose}
            >
              <LayoutDashboard size={20} />
              <span>{t("nav.dashboard")}</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link
              href="/bookings"
              className={pathname === "/bookings" ? "nav-link active" : "nav-link"}
              onClick={onClose}
            >
              <Calendar size={20} />
              <span>{t("nav.bookings")}</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link
              href="/fleet"
              className={pathname === "/fleet" ? "nav-link active" : "nav-link"}
              onClick={onClose}
            >
              <Car size={20} />
              <span>{t("nav.fleet")}</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link
              href="/clients"
              className={pathname === "/clients" ? "nav-link active" : "nav-link"}
              onClick={onClose}
            >
              <Users size={20} />
              <span>{t("nav.clients")}</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link
              href="/expenses"
              className={pathname === "/expenses" ? "nav-link active" : "nav-link"}
              onClick={onClose}
            >
              <TrendingDown size={20} />
              <span>{t("nav.expenses")}</span>
            </Link>
          </li>
          {userIsAdmin && (
            <>
              <li className="nav-item">
                <Link
                  href="/agents"
                  className={pathname === "/agents" ? "nav-link active" : "nav-link"}
                  onClick={onClose}
                >
                  <UserCircle size={20} />
                  <span>{t("nav.agents")}</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/commissions"
                  className={pathname === "/commissions" ? "nav-link active" : "nav-link"}
                  onClick={onClose}
                >
                  <DollarSign size={20} />
                  <span>{t("nav.commissions")}</span>
                </Link>
              </li>
            </>
          )}
          {!userIsAdmin && (
            <li className="nav-item">
              <Link
                href="/my-commissions"
                className={pathname === "/my-commissions" ? "nav-link active" : "nav-link"}
                onClick={onClose}
              >
                <DollarSign size={20} />
                <span>{t("nav.myCommissions")}</span>
              </Link>
            </li>
          )}
          <li className="nav-item">
            <Link
              href="/insurance"
              className={pathname === "/insurance" ? "nav-link active" : "nav-link"}
              onClick={onClose}
            >
              <FileText size={20} />
              <span>{t("nav.insurance")}</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <Link
          href="/settings"
          className={pathname === "/settings" ? "nav-link active" : "nav-link"}
          onClick={onClose}
        >
          <Settings size={20} />
          <span>{t("nav.settings")}</span>
        </Link>

        <button className="nav-link logout-button" onClick={handleLogout}>
          <LogOut size={20} />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
};