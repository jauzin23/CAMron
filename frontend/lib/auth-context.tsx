"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  });

  // On mount, ask the backend to verify the session cookie.
  // No token is stored client-side — the HttpOnly cookie is sent automatically.
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (res.ok) {
          setState({ isAuthenticated: true, isLoading: false });
        } else {
          setState({ isAuthenticated: false, isLoading: false });
        }
      })
      .catch(() => {
        setState({ isAuthenticated: false, isLoading: false });
      });
  }, []);

  useEffect(() => {
    function handleForcedLogout() {
      setState({ isAuthenticated: false, isLoading: false });
    }

    window.addEventListener("camron:logout", handleForcedLogout);
    return () =>
      window.removeEventListener("camron:logout", handleForcedLogout);
  }, []);

  const login = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? "Erro de autenticação",
          };
        }

        setState({
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      } catch {
        return { success: false, error: "Não foi possível ligar ao servidor" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if the request fails, clear local state
    }
    setState({ isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
