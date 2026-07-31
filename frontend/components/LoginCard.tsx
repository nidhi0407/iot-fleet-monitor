"use client";

import React from "react";
import { Activity, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginCard() {
  const { login } = useAuth();

  const handleGoogleLogin = () => {
    window.location.href = "http://127.0.0.1:8000/login";
  };

  const handleDemoLogin = () => {
    // Quick demo login bypass to inspect dashboard directly
    login("demo-jwt-token-pulsegrid-2026", {
      name: "Fleet Engineer",
      email: "engineer@pulsegrid.io",
    });
  };

  return (
    <div className="w-full max-w-md p-8 sm:p-10 rounded-2xl bg-[#18181B]/90 backdrop-blur-xl border border-[#27272A] shadow-2xl shadow-black/60 text-center relative overflow-hidden transition-all duration-300">
      {/* Top subtle glow line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Logo */}
      <div className="inline-flex items-center justify-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
          PulseGrid
        </span>
      </div>

      {/* Subtitle */}
      <h1 className="text-lg font-medium text-[#FAFAFA] mb-2 tracking-tight">
        Industrial IoT Fleet Monitoring Platform
      </h1>

      {/* Small caption */}
      <p className="text-xs text-[#A1A1AA] mb-8 font-mono tracking-wide">
        Powered by Google OAuth • JWT • MQTT
      </p>

      {/* Buttons */}
      <div className="space-y-3">
        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full py-3.5 px-5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] border border-zinc-700/80 text-[#FAFAFA] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-primary/10 hover:border-primary/50 active:scale-[0.99] group cursor-pointer"
        >
          {/* Official Google G Logo */}
          <svg
            className="w-5 h-5 transition-transform duration-200 group-hover:scale-105"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* Demo Direct Access Button */}
        <button
          onClick={handleDemoLogin}
          className="w-full py-3 px-5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-medium text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>Quick Demo / Direct Dashboard Access</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Footer indicator */}
      <div className="mt-8 pt-6 border-t border-[#27272A]/60 flex items-center justify-center gap-2 text-xs text-[#A1A1AA]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Backend Connected • http://127.0.0.1:8000</span>
      </div>
    </div>
  );
}
