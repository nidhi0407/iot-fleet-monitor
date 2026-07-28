const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type DeviceStatus = {
  id: string;
  location: string;
  online: boolean;
  last_seen: string | null;
  latest_temperature_c: number | null;
  latest_battery_pct: number | null;
  latest_is_anomaly: boolean;
};

export type Reading = {
  id: number;
  device_id: string;
  temperature_c: number;
  battery_pct: number;
  timestamp: string;
  is_anomaly: boolean;
};

export type Alert = {
  id: number;
  device_id: string;
  reason: string;
  created_at: string;
  resolved: boolean;
};

export async function fetchDevices(): Promise<DeviceStatus[]> {
  const res = await fetch(`${API_BASE}/devices`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

export async function fetchReadings(deviceId: string, limit = 30): Promise<Reading[]> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/readings?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch readings");
  return res.json();
}

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/alerts`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function resolveAlert(alertId: number): Promise<void> {
  await fetch(`${API_BASE}/alerts/${alertId}/resolve`, { method: "POST" });
}
