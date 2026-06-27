"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, VideoOff } from "lucide-react";
import { cameras } from "@/lib/cameras";
import { CameraStream } from "@/components/camera-stream";
import { use } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function CameraFullscreenPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const camera = cameras.find((c) => c.id === resolvedParams.id);

  if (!camera) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-zinc-400">
        <VideoOff className="size-12 mb-4 text-zinc-600" />
        <h2 className="text-xl font-mono">CAMERA NOT FOUND</h2>
        <Link 
          href="/view"
          className="mt-4 px-4 py-2 border border-zinc-800 rounded-md hover:bg-zinc-900 transition-colors"
        >
          Return to Wall
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-black flex flex-col group/view">
      {/* Compact Static Header */}
      <header className="h-16 shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/view" 
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }), 
              "h-9 gap-1.5 px-3 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
            )}
          >
            <ArrowLeft className="size-4" />
            <span>Live Wall</span>
          </Link>
          <div className="h-5 w-px bg-zinc-800" />
          <div className="flex items-center gap-2 select-none">
            <span className="text-xs font-semibold tracking-wider font-mono text-zinc-200">{camera.name.toUpperCase()}</span>
            <span className="text-[10px] font-mono text-zinc-500">[{camera.id.toUpperCase()}]</span>
            <span className="flex h-2 w-2 relative ml-1">
              {camera.status === "offline" ? (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-650"></span>
              ) : (
                <>
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    camera.status === "recording" ? "bg-red-400" : "bg-emerald-400"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    camera.status === "recording" ? "bg-red-500" : "bg-emerald-500"
                  )}></span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Telemetry info */}
          <div className="hidden sm:flex items-center gap-4 font-mono text-[10px] text-zinc-500 pr-3 border-r border-zinc-800/80 mr-1 h-5">
            <div>IP: <span className="text-zinc-300">{camera.ip}</span></div>
            <div>FPS: <span className="text-zinc-300">{camera.fps}</span></div>
            <div>SIGNAL: <span className="text-zinc-300">{camera.dbm} dBm</span></div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "font-mono text-[9px] uppercase border-none tracking-widest px-2 py-0.5 select-none",
              camera.status === "offline" 
                ? "bg-zinc-900 text-zinc-500" 
                : camera.status === "recording" 
                  ? "bg-red-500/10 text-red-500" 
                  : "bg-emerald-500/10 text-emerald-400"
            )}
          >
            {camera.status}
          </Badge>
        </div>
      </header>

      <div className="flex-1 w-full h-full relative">
        <CameraStream camera={camera} hideExpand={true} />
      </div>
    </div>
  );
}
