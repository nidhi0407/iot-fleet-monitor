import { DeviceStatus } from "@/lib/api";
import Sparkline from "./Sparkline";

type Props = {
  device: DeviceStatus;
  history: number[];
};

export default function DeviceCard({ device, history }: Props) {
  const statusLabel = !device.online ? "OFFLINE" : device.latest_is_anomaly ? "ANOMALY" : "NOMINAL";

  return (
    <div className={`device-card device-card--${statusLabel.toLowerCase()}`}>
      <div className="device-card__header">
        <div className="device-card__id-row">
          <span className="status-dot" />
          <span className="device-card__id">{device.id}</span>
        </div>
        <span className="device-card__status">{statusLabel}</span>
      </div>

      <p className="device-card__location">{device.location}</p>

      <div className="device-card__reading">
        <span className="device-card__temp">
          {device.latest_temperature_c !== null ? device.latest_temperature_c.toFixed(1) : "--"}
          <span className="device-card__unit">°C</span>
        </span>
        <Sparkline values={history} />
      </div>

      <div className="device-card__footer">
        <span>Battery {device.latest_battery_pct?.toFixed(0) ?? "--"}%</span>
        <span>
          {device.last_seen ? `last seen ${timeAgo(device.last_seen)}` : "never seen"}
        </span>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso + "Z").getTime();
  const seconds = Math.max(0, Math.round(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}
