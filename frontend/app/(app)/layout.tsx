"use client";

import type React from "react";
import { AppHeader } from "@/components/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
