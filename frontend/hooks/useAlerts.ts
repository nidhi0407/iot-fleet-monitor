"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAlerts, resolveAlert } from "@/lib/api";
import { Alert } from "@/types/alert";

const POLL_INTERVAL_MS = 4000;

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch alerts:", err);
      setError("Failed to sync alert feed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResolve = async (alertId: number) => {
    try {
      // Optimistic update
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
      );
      await resolveAlert(alertId);
      await refresh();
    } catch (err) {
      console.error("Failed to resolve alert:", err);
      await refresh();
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    alerts,
    loading,
    error,
    resolveAlert: handleResolve,
    refetch: refresh,
  };
}
