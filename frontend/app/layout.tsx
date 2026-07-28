import "./globals.css";

export const metadata = {
  title: "IoT Fleet Monitor",
  description: "Live telemetry and anomaly monitoring for a simulated device fleet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
