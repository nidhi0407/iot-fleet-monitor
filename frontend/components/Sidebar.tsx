"use client";

import React from "react";
import { Activity, LayoutDashboard, Cpu, AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  alertCount?: number;
  deviceCount?: number;
}

export default function Sidebar({
  activeTab = "dashboard",
  setActiveTab,
  alertCount = 0,
  deviceCount = 0,
}: SidebarProps) {
  const { logout } = useAuth();

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "devices",
      label: "Devices",
      icon: Cpu,
      badge: deviceCount > 0 ? deviceCount : null,
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : null,
      badgeColor: "bg-red-500/20 text-red-400 border border-red-500/30",
    },
  ];

  return (
    <aside className="w-64 bg-[#111111] border-r border-[#27272A] flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 border-b border-[#27272A] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm shadow-primary/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-lg font-bold text-[#FAFAFA] tracking-tight">
            PulseGrid
          </span>
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-1">
          <p className="px-3 py-2 text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab?.(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-[#18181B] text-[#FAFAFA] border border-[#27272A] shadow-sm"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-primary" : "text-[#A1A1AA]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                      item.badgeColor || "bg-[#27272A] text-[#FAFAFA]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-[#27272A]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#A1A1AA] hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
