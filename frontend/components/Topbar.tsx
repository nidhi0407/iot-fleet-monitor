"use client";

import React from "react";
import { LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TopbarProps {
  title?: string;
  lastUpdated?: Date | null;
}

export default function Topbar({
  title = "Fleet Dashboard",
  lastUpdated,
}: TopbarProps) {
  const { user, logout } = useAuth();

  const userName = user?.name || user?.email?.split("@")[0] || "Fleet Administrator";
  const userEmail = user?.email || "admin@pulsegrid.io";

  return (
    <header className="h-16 border-b border-[#27272A] bg-[#09090B]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Page Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-[#FAFAFA] tracking-tight">
          {title}
        </h1>
        {lastUpdated && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-xs font-mono text-[#A1A1AA]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sync: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-4">
        {/* User profile capsule */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#18181B] border border-[#27272A]">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={userName}
              className="w-7 h-7 rounded-full object-cover border border-[#27272A]"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xs font-bold font-mono">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-[#FAFAFA] leading-tight flex items-center gap-1">
              {userName}
              <ShieldCheck className="w-3 h-3 text-indigo-400 inline" />
            </span>
            <span className="text-[10px] text-[#A1A1AA] font-mono leading-tight">
              {userEmail}
            </span>
          </div>
        </div>

        {/* Quick Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-xl bg-[#18181B] hover:bg-red-500/10 border border-[#27272A] hover:border-red-500/30 text-[#A1A1AA] hover:text-red-400 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
