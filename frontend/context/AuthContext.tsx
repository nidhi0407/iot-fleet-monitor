"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuth,
  UserProfile,
} from "@/lib/auth";

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user?: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Sync initial state from localStorage
    const existingToken = getToken();
    const existingUser = getUser();

    if (existingToken) {
      setTokenState(existingToken);
      setUserState(existingUser);
    }

    setLoading(false);
  }, []);

  const login = (token: string, user?: UserProfile) => {
    setToken(token);
    setTokenState(token);
    if (user) {
      setUser(user);
      setUserState(user);
    } else {
      const defaultUser: UserProfile = {
        name: "Fleet Engineer",
        email: "engineer@pulsegrid.io",
      };
      setUser(defaultUser);
      setUserState(defaultUser);
    }
    router.push("/dashboard");
  };

  const logout = () => {
    clearAuth();
    setTokenState(null);
    setUserState(null);
    router.push("/");
  };

  const isAuthenticated = !!tokenState;

  return (
    <AuthContext.Provider
      value={{
        token: tokenState,
        user: userState,
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
