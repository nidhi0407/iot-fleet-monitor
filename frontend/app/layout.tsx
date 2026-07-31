import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "PulseGrid — Industrial IoT Fleet Monitoring",
  description: "Enterprise Real-Time Telemetry & Anomaly Diagnostics Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090B] text-[#FAFAFA] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
