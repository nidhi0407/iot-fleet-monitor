"use client";

import React from "react";
import { Cpu, Battery, BatteryLow, BatteryMedium, BatteryFull, MapPin } from "lucide-react";
import { Device } from "@/types/device";

interface DeviceTableProps {
  devices: Device[];
  loading?: boolean;
}

export default function DeviceTable({ devices, loading = false }: DeviceTableProps) {
  const formatLastSeen = (timestamp: string | null) => {
    if (!timestamp) return "Never";
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

  const getBatteryIcon = (pct: number | null) => {
    if (pct === null) return <Battery className="w-4 h-4 text-zinc-500" />;
    if (pct <= 20) return <BatteryLow className="w-4 h-4 text-red-400" />;
    if (pct <= 60) return <BatteryMedium className="w-4 h-4 text-amber-400" />;
    return <BatteryFull className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="rounded-xl bg-[#18181B] border border-[#27272A] shadow-lg shadow-black/20 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#FAFAFA] tracking-tight">
              Monitored Devices
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Real-time hardware status and battery levels
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-[#A1A1AA] px-2.5 py-1 rounded-full bg-[#09090B] border border-[#27272A]">
          {devices.length} Nodes Registered
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090B]/60 text-[#A1A1AA] font-mono uppercase tracking-wider border-b border-[#27272A]">
            <tr>
              <th className="py-3.5 px-5 font-semibold">Device</th>
              <th className="py-3.5 px-5 font-semibold">Temperature</th>
              <th className="py-3.5 px-5 font-semibold">Battery</th>
              <th className="py-3.5 px-5 font-semibold">Status</th>
              <th className="py-3.5 px-5 font-semibold text-right">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
            {loading && devices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#A1A1AA] font-mono">
                  Loading device fleet data...
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#A1A1AA] font-mono">
                  No devices connected to fleet monitor.
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-[#27272A]/40 transition-colors duration-150 group"
                >
                  {/* Device ID & Location */}
                  <td className="py-4 px-5">
                    <div className="flex flex-col">
                      <span className="font-mono font-semibold text-[#FAFAFA] group-hover:text-indigo-400 transition-colors">
                        {d.id}
                      </span>
                      <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        {d.location}
                      </span>
                    </div>
                  </td>

                  {/* Temperature */}
                  <td className="py-4 px-5">
                    {d.latest_temperature_c !== null ? (
                      <span className="font-mono text-sm font-medium">
                        {d.latest_temperature_c.toFixed(1)}
                        <span className="text-zinc-500 text-xs ml-0.5">°C</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600 font-mono">N/A</span>
                    )}
                  </td>

                  {/* Battery */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      {getBatteryIcon(d.latest_battery_pct)}
                      <span className="font-mono font-medium">
                        {d.latest_battery_pct !== null
                          ? `${d.latest_battery_pct}%`
                          : "N/A"}
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-5">
                    {d.online ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-mono font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Offline
                      </span>
                    )}
                  </td>

                  {/* Last Seen */}
                  <td className="py-4 px-5 text-right font-mono text-[#A1A1AA]">
                    {formatLastSeen(d.last_seen)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
