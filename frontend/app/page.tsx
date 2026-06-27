"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { CameraCard } from "@/components/camera-card";
import { cameras } from "@/lib/cameras";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-12 min-h-full">
        <div className="view-container space-y-6">
          {/* Header / Stats Info */}
          <div className="animate-title-section mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
                Device Management
              </h1>
              <p className="text-sm text-zinc-400">Configure and monitor all cluster nodes</p>
            </div>
            
            <div className="flex items-center">
              <Link href="/view">
                <Button variant="outline" size="sm" className="gap-2 bg-zinc-950/50 border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-900 transition-colors">
                  <LayoutGrid className="size-4 text-emerald-400" />
                  Live Wall
                </Button>
              </Link>
            </div>
          </div>

          {/* Cameras Grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cameras.map((camera) => (
              <div key={camera.id} className="animate-grid-item">
                <CameraCard camera={camera} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
