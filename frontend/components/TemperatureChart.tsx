"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Thermometer, RefreshCw } from "lucide-react";
import { fetchReadings } from "@/lib/api";
import { Device, Reading } from "@/types/device";

interface TemperatureChartProps {
  devices: Device[];
}

export default function TemperatureChart({ devices }: TemperatureChartProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Default to first device when devices load
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  // Fetch readings whenever selected device changes
  useEffect(() => {
    if (!selectedDeviceId) return;

    let isMounted = true;
    const loadReadings = async () => {
      setLoading(true);
      try {
        const data = await fetchReadings(selectedDeviceId, 30);
        if (isMounted) {
          setReadings(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading readings:", err);
          setError("Failed to load telemetry readings");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReadings();
    const interval = setInterval(loadReadings, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedDeviceId]);

  // Prepare chart data
  const chartData = readings.map((r) => {
    const dateObj = new Date(r.timestamp);
    const formattedTime = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : r.timestamp;

    return {
      time: formattedTime,
      temperature: r.temperature_c,
      isAnomaly: r.is_anomaly,
    };
  });

  return (
    <div className="p-6 rounded-xl bg-[#18181B] border border-[#27272A] shadow-lg shadow-black/20 text-[#FAFAFA]">
      {/* Header with Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#FAFAFA] tracking-tight">
              Temperature Telemetry
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Latest 30 readings for selected IoT node
            </p>
          </div>
        </div>

        {/* Device Selector */}
        <div className="flex items-center gap-2">
          {loading && (
            <RefreshCw className="w-3.5 h-3.5 text-[#A1A1AA] animate-spin" />
          )}
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="bg-[#09090B] border border-[#27272A] text-xs font-mono text-[#FAFAFA] rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} ({d.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-72 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-[#A1A1AA]">
            {loading ? "Fetching readings..." : "No readings available"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272A"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                stroke="#A1A1AA"
                tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#27272A" }}
              />

              <YAxis
                stroke="#A1A1AA"
                tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#27272A" }}
                unit="°C"
                domain={["auto", "auto"]}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-lg shadow-xl text-xs font-mono">
                        <p className="text-[#A1A1AA] mb-1">{data.time}</p>
                        <p className="text-[#FAFAFA] font-bold">
                          Temp:{" "}
                          <span className="text-indigo-400">
                            {data.temperature}°C
                          </span>
                        </p>
                        {data.isAnomaly && (
                          <span className="mt-1 inline-block text-[10px] text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            Anomaly Detected
                          </span>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#6366F1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#tempGradient)"
                activeDot={{ r: 6, fill: "#818CF8", stroke: "#18181B", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
