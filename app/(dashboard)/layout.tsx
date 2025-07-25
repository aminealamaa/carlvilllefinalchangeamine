'use client'

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Header } from "@/components/layouts/Header";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import "@/layouts/AppLayout.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="app-main">
        <Header onMenuClick={toggleSidebar} />

        <div className="app-content">
          <Breadcrumbs path={pathname} />
          <main className="app-container">{children}</main>
        </div>
      </div>
    </div>
  );
}