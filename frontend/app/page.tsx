"use client";

import { useEffect, useState, useCallback } from "react";
import DeviceCard from "@/components/DeviceCard";
import AlertsPanel from "@/components/AlertsPanel";
import { fetchDevices, fetchReadings, fetchAlerts, resolveAlert, DeviceStatus, Alert } from "@/lib/api";

const POLL_INTERVAL_MS = 4000;

export default function DashboardPage() {
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [deviceList, alertList] = await Promise.all([fetchDevices(), fetchAlerts()]);
      setDevices(deviceList);
      setAlerts(alertList);
      setLastUpdated(new Date());
      setError(null);

      const historyEntries = await Promise.all(
        deviceList.map(async (d) => {
          const readings = await fetchReadings(d.id, 30);
          return [d.id, readings.map((r) => r.temperature_c)] as const;
        })
      );
      setHistory(Object.fromEntries(historyEntries));
    } catch (err) {
      setError("Can't reach the backend. Is `uvicorn main:app` running on port 8000?");
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleResolve = async (alertId: number) => {
    await resolveAlert(alertId);
    refresh();
  };

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <main className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">IOT FLEET MONITOR</h1>
        <span className="dashboard__meta">
          {lastUpdated ? `updated ${lastUpdated.toLocaleTimeString()}` : "connecting..."}
        </span>
      </div>
      <p className="dashboard__subtitle">
        {devices.length === 0
          ? "Waiting for devices..."
          : `${onlineCount} / ${devices.length} devices online`}
      </p>

      {error && <p style={{ color: "var(--signal-red)", fontSize: 13 }}>{error}</p>}

      <div className="dashboard__grid">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} history={history[device.id] ?? []} />
        ))}
      </div>

      <AlertsPanel alerts={alerts} onResolve={handleResolve} />
    </main>
  );
}
