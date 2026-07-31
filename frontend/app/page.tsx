"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NetworkBackground from "@/components/NetworkBackground";
import LoginCard from "@/components/LoginCard";
import { useAuth } from "@/context/AuthContext";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // If authenticated, redirect to dashboard
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
      return;
    }

    // Check if OAuth callback query params contain token
    const token =
      searchParams.get("access_token") || searchParams.get("token");
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const picture = searchParams.get("picture");

    if (token) {
      login(token, {
        name: name || undefined,
        email: email || undefined,
        picture: picture || undefined,
      });
    }
  }, [searchParams, isAuthenticated, loading, router, login]);

  return (
    <main className="min-h-screen w-full bg-[#09090B] text-[#FAFAFA] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left side: Network visualization */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 relative border-r border-[#27272A] flex-col justify-between p-12 overflow-hidden">
        <NetworkBackground />

        {/* Overlay ambient tech branding */}
        <div className="absolute top-10 left-10 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181B]/80 border border-[#27272A] backdrop-blur-md text-xs font-mono text-[#A1A1AA]">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Telemetry Pipeline Active</span>
          </div>
        </div>

        <div className="absolute bottom-10 left-10 z-10 max-w-md">
          <p className="text-xs font-mono text-indigo-400 mb-2 uppercase tracking-widest">
            Enterprise Fleet Monitoring
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
            Real-time telemetry, anomaly detection, and device diagnostics.
          </h2>
        </div>
      </div>

      {/* Right side: Login Card */}
      <div className="w-full md:w-1/2 lg:w-5/12 min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#09090B] via-[#111111] to-[#09090B] relative">
        {/* Subtle ambient light */}
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <LoginCard />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-[#A1A1AA] font-mono text-sm">
          Loading PulseGrid...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
