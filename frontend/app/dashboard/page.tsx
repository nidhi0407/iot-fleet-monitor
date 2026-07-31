"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Thermometer,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import DeviceTable from "@/components/DeviceTable";
import TemperatureChart from "@/components/TemperatureChart";
import AlertsPanel from "@/components/AlertsPanel";
import { useAuth } from "@/context/AuthContext";
import { useDevices } from "@/hooks/useDevices";
import { useAlerts } from "@/hooks/useAlerts";

export default function DashboardPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const { devices, loading: devicesLoading, error: devicesError } = useDevices();
  const { alerts, resolveAlert, error: alertsError } = useAlerts();

  // Route protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || (!isAuthenticated && typeof window !== "undefined")) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-[#A1A1AA] font-mono text-sm">
        Authenticating session...
      </div>
    );
  }

  // Calculate metrics for overview cards
  const onlineCount = devices.filter((d) => d.online).length;
  const offlineCount = devices.filter((d) => !d.online).length;
  const activeAlertsCount = alerts.filter((a) => !a.resolved).length;

  const tempsWithValues = devices
    .map((d) => d.latest_temperature_c)
    .filter((t): t is number => t !== null && t !== undefined);

  const avgTemp =
    tempsWithValues.length > 0
      ? (
          tempsWithValues.reduce((sum, t) => sum + t, 0) / tempsWithValues.length
        ).toFixed(1)
      : "N/A";

  const totalDevices = devices.length;
  const onlinePct =
    totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex font-sans antialiased">
      {/* Permanent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={activeAlertsCount}
        deviceCount={totalDevices}
      />

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#09090B]">
        {/* Topbar */}
        <Topbar
          title={
            activeTab === "dashboard"
              ? "Fleet Overview"
              : activeTab === "devices"
              ? "Hardware Telemetry Nodes"
              : "Anomaly Feed & Alerts"
          }
          lastUpdated={new Date()}
        />

        {/* Content Area */}
        <main className="p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* Backend Connection Error Banner */}
          {(devicesError || alertsError) && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-xs text-red-300 font-mono">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="font-bold">Backend Connection Failure</p>
                <p className="text-red-400/80">
                  {devicesError || alertsError} — Please ensure FastAPI backend is running at http://127.0.0.1:8000
                </p>
              </div>
            </div>
          )}

          {/* OVERVIEW STAT CARDS (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Online Devices */}
            <StatCard
              title="Online Devices"
              value={onlineCount}
              description={`${onlinePct}% of total fleet connected`}
              icon={Wifi}
              iconColor="text-emerald-400"
              badge="Active"
              badgeType="success"
            />

            {/* 2. Offline Devices */}
            <StatCard
              title="Offline Devices"
              value={offlineCount}
              description={
                offlineCount > 0 ? "Requires maintenance check" : "Fleet 100% operational"
              }
              icon={WifiOff}
              iconColor="text-red-400"
              badge={offlineCount > 0 ? "Attention" : "Nominal"}
              badgeType={offlineCount > 0 ? "danger" : "neutral"}
            />

            {/* 3. Active Alerts */}
            <StatCard
              title="Active Alerts"
              value={activeAlertsCount}
              description={
                activeAlertsCount > 0
                  ? "Unresolved threshold breaches"
                  : "Zero active anomalies"
              }
              icon={AlertTriangle}
              iconColor="text-amber-400"
              badge={activeAlertsCount > 0 ? "Action Needed" : "Clear"}
              badgeType={activeAlertsCount > 0 ? "warning" : "success"}
            />

            {/* 4. Average Temperature */}
            <StatCard
              title="Average Temperature"
              value={avgTemp !== "N/A" ? `${avgTemp}°C` : "N/A"}
              description="Mean sensor thermal reading"
              icon={Thermometer}
              iconColor="text-indigo-400"
              badge="Fleet Mean"
              badgeType="neutral"
            />
          </div>

          {/* MAIN TAB CONTENT */}
          {activeTab === "dashboard" && (
            <>
              {/* Temperature Line Chart */}
              <TemperatureChart devices={devices} />

              {/* Grid: Device Table + Alerts Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                  <DeviceTable devices={devices} loading={devicesLoading} />
                </div>
                <div className="lg:col-span-1">
                  <AlertsPanel alerts={alerts} onResolve={resolveAlert} />
                </div>
              </div>
            </>
          )}

          {activeTab === "devices" && (
            <div className="space-y-8">
              <DeviceTable devices={devices} loading={devicesLoading} />
              <TemperatureChart devices={devices} />
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="max-w-3xl mx-auto">
              <AlertsPanel alerts={alerts} onResolve={resolveAlert} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
