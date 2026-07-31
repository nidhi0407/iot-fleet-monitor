"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchDevices } from "@/lib/api";
import { Device } from "@/types/device";

const POLL_INTERVAL_MS = 4000;

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch devices:", err);
      setError("Unable to connect to telemetry backend at http://127.0.0.1:8000");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { devices, loading, error, refetch: refresh };
}
