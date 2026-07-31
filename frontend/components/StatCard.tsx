"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  badge?: string;
  badgeType?: "success" | "danger" | "warning" | "neutral";
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary",
  badge,
  badgeType = "neutral",
}: StatCardProps) {
  const badgeStyles = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    neutral: "bg-zinc-800 text-[#A1A1AA] border-zinc-700",
  };

  return (
    <div className="p-5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-zinc-700 transition-all duration-200 shadow-lg shadow-black/20 group relative overflow-hidden">
      {/* Subtle top glow bar */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent group-hover:via-primary/50 transition-all duration-300" />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#A1A1AA] tracking-wide">
          {title}
        </span>
        <div
          className={`p-2 rounded-lg bg-[#27272A]/60 border border-[#27272A] ${iconColor} transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-2xl font-bold font-mono text-[#FAFAFA] tracking-tight">
          {value}
        </span>
        {badge && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-mono border font-medium ${badgeStyles[badgeType]}`}
          >
            {badge}
          </span>
        )}
      </div>

      <p className="text-xs text-[#A1A1AA] truncate">{description}</p>
    </div>
  );
}
