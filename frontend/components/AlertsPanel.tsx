"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Alert } from "@/types/alert";

interface AlertsPanelProps {
  alerts: Alert[];
  onResolve: (id: number) => Promise<void> | void;
}

export default function AlertsPanel({ alerts, onResolve }: AlertsPanelProps) {
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const activeAlerts = alerts.filter((a) => !a.resolved);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await onResolve(id);
    } finally {
      setResolvingId(null);
    }
  };

  const formatAlertTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="rounded-xl bg-[#18181B] border border-[#27272A] shadow-lg shadow-black/20 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#FAFAFA] tracking-tight">
              Active Anomaly Alerts
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Unresolved alerts requiring technical action
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
            activeAlerts.length > 0
              ? "bg-red-500/10 text-red-400 border-red-500/30"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          }`}
        >
          {activeAlerts.length} Active
        </span>
      </div>

      {/* Alert List */}
      <div className="p-4">
        {activeAlerts.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
            <p className="text-xs font-mono text-[#FAFAFA]">
              All fleet systems operating nominally.
            </p>
            <p className="text-[11px] text-[#A1A1AA]">
              No active anomalies or warning triggers detected.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-lg bg-[#09090B] border border-red-500/20 hover:border-red-500/40 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#FAFAFA]">
                        {alert.device_id}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] font-mono">
                        {formatAlertTime(alert.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-red-300/90 mt-0.5 font-sans">
                      {alert.reason}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolvingId === alert.id}
                  className="px-3 py-1.5 rounded-lg bg-[#18181B] hover:bg-emerald-500/10 border border-[#27272A] hover:border-emerald-500/40 text-[#FAFAFA] hover:text-emerald-400 text-xs font-medium font-mono transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {resolvingId === alert.id ? "Resolving..." : "Resolve"}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
