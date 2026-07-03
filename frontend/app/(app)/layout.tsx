"use client";

import type React from "react";
import { AppHeader } from "@/components/app-header";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginScreen } from "@/components/login-screen";
import { AnimatePresence, motion } from "framer-motion";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex h-screen w-full items-center justify-center bg-background overflow-hidden"
        >
          <span className="text-sm text-muted-foreground">A carregar…</span>
        </motion.div>
      ) : !isAuthenticated ? (
        <motion.div
          key="login-screen"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98, y: -8 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-full h-screen overflow-hidden"
        >
          <LoginScreen />
        </motion.div>
      ) : (
        <motion.div
          key="app-dashboard"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex h-screen flex-col overflow-hidden bg-background w-full"
        >
          <AppHeader />
          <div className="flex-1 overflow-y-auto flex flex-col">
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
