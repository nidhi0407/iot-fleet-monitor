import { Alert } from "@/lib/api";

type Props = {
  alerts: Alert[];
  onResolve: (id: number) => void;
};

const REASON_LABELS: Record<string, string> = {
  temperature_spike: "Temperature spike",
  device_offline: "Device went offline",
};

export default function AlertsPanel({ alerts, onResolve }: Props) {
  const active = alerts.filter((a) => !a.resolved);

  return (
    <div className="alerts-panel">
      <div className="alerts-panel__header">
        <h2>Alerts</h2>
        <span className="alerts-panel__count">{active.length} active</span>
      </div>

      {active.length === 0 ? (
        <p className="alerts-panel__empty">No active alerts. Fleet is nominal.</p>
      ) : (
        <ul className="alerts-panel__list">
          {active.map((alert) => (
            <li key={alert.id} className="alerts-panel__item">
              <div>
                <span className="alerts-panel__device">{alert.device_id}</span>
                <span className="alerts-panel__reason">
                  {REASON_LABELS[alert.reason] ?? alert.reason}
                </span>
              </div>
              <button onClick={() => onResolve(alert.id)}>Resolve</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
