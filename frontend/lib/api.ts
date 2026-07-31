import axios from "axios";
import { getToken } from "./auth";
import { Device, Reading } from "@/types/device";
import { Alert } from "@/types/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to automatically attach Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export async function fetchDevices(): Promise<Device[]> {
  const response = await apiClient.get<Device[]>("/devices");
  return response.data;
}

export async function fetchReadings(
  deviceId: string,
  limit: number = 30
): Promise<Reading[]> {
  const response = await apiClient.get<Reading[]>(
    `/devices/${deviceId}/readings`,
    {
      params: { limit },
    }
  );
  return response.data;
}

export async function fetchAlerts(): Promise<Alert[]> {
  const response = await apiClient.get<Alert[]>("/alerts");
  return response.data;
}

export async function resolveAlert(alertId: number): Promise<void> {
  await apiClient.post(`/alerts/${alertId}/resolve`);
}
