"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { restoreSession, clienteMe } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAllowed(true);
    setChecked(true);
  }, []);

  if (!checked || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        A verificar sessão...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader />
      <div className="flex-1 overflow-y-auto flex flex-col">
        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
