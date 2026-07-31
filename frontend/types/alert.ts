export interface Alert {
  id: number;
  device_id: string;
  reason: string;
  created_at: string;
  resolved: boolean;
}
