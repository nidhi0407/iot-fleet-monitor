export interface Device {
  id: string;
  location: string;
  online: boolean;
  last_seen: string | null;
  latest_temperature_c: number | null;
  latest_battery_pct: number | null;
  latest_is_anomaly: boolean;
}

export interface Reading {
  id: number;
  device_id: string;
  temperature_c: number;
  battery_pct: number | null;
  timestamp: string;
  is_anomaly: boolean;
}
