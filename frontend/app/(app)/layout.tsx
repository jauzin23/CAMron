"use client";

import type React from "react";
import { AppHeader } from "@/components/app-header";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginScreen } from "@/components/login-screen";

// ── Inner layout (needs auth context) ────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Minimal loading state while verifying the stored token
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">A carregar…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader />
      <div className="flex-1 overflow-y-auto flex flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
