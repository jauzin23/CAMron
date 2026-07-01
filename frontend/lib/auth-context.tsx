"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const SESSION_KEY = "camron_jwt";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getToken: () => string | null;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // On mount: check if there is a valid JWT in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      setState({ token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Verify the stored token with the backend
    fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: stored }),
    })
      .then((res) => {
        if (res.ok) {
          setState({ token: stored, isAuthenticated: true, isLoading: false });
        } else {
          // Token expired or invalid — clear it
          sessionStorage.removeItem(SESSION_KEY);
          setState({ token: null, isAuthenticated: false, isLoading: false });
        }
      })
      .catch(() => {
        // Network error: keep the stored token, allow offline retry
        sessionStorage.removeItem(SESSION_KEY);
        setState({ token: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  // Listen for the global logout event dispatched by the API client on 401 responses
  useEffect(() => {
    function handleForcedLogout() {
      sessionStorage.removeItem(SESSION_KEY);
      setState({ token: null, isAuthenticated: false, isLoading: false });
    }

    window.addEventListener("camron:logout", handleForcedLogout);
    return () => window.removeEventListener("camron:logout", handleForcedLogout);
  }, []);

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error ?? "Erro de autenticação" };
      }

      sessionStorage.setItem(SESSION_KEY, data.token);
      setState({ token: data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch {
      return { success: false, error: "Não foi possível ligar ao servidor" };
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setState({ token: null, isAuthenticated: false, isLoading: false });
  }, []);

  const getToken = useCallback(() => {
    return sessionStorage.getItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
