"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Expand, Camera, WifiOff, Settings, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Camera as CameraType } from "@/lib/cameras";
import { cn } from "@/lib/utils";
import Link from "next/link";

const UNSPLASH_IMAGES: Record<string, string> = {
  "cam-01": "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80", // Main Entrance
  "cam-02": "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=800&q=80", // North Garage
  "cam-03": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80", // Backyard
  "cam-04": "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80", // Side Hallway
  "cam-05": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80", // Server Room
  "cam-06": "https://images.unsplash.com/photo-1563298723-dcfebaa3a2ec?auto=format&fit=crop&w=800&q=80", // Outer Gate
};

interface CameraStreamProps {
  camera: CameraType;
  hideExpand?: boolean;
}

export function CameraStream({ camera, hideExpand }: CameraStreamProps) {
  const [timestamp, setTimestamp] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setTimestamp(`${dateStr} ${timeStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const imageUrl = UNSPLASH_IMAGES[camera.id] || UNSPLASH_IMAGES["cam-01"];
  const isOffline = camera.status === "offline";

  const handleSnapshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSnapshotting(true);
    setTimeout(() => {
      setIsSnapshotting(false);
      // Trigger a direct download of the mock image
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${camera.name.toLowerCase().replace(/\s+/g, "-")}-snapshot.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 600);
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden bg-zinc-950 border-[0.5px] border-zinc-900/80 h-full w-full rounded-none transition-all duration-300 group",
        isHovered ? "z-30 shadow-[inset_0_0_30px_rgba(0,0,0,0.95)]" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0 w-full h-full relative flex items-center justify-center select-none overflow-hidden">
        {isOffline ? (
          // CRT Static Noise Simulator for Offline Cameras
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-4">
            {/* Dynamic scanlines & retro snow pattern overlay */}
            <div 
              className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage: "radial-gradient(circle at center, transparent 0%, black 100%), url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')",
              }}
            />
            {/* Fine scanline line pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] pointer-events-none" />
            
            <div className="flex flex-col items-center gap-3 text-center z-10">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-red-500/20 blur-md animate-pulse" />
                <WifiOff className="size-8 text-zinc-500 relative animate-bounce" />
              </div>
              <div className="space-y-1 font-mono">
                <span className="text-[11px] font-semibold tracking-wider text-red-500/80 uppercase animate-pulse">
                  [ Loss of Signal ]
                </span>
                <h4 className="text-sm font-semibold text-zinc-400">{camera.name}</h4>
                <p className="text-[10px] text-zinc-600">{camera.ip}</p>
              </div>
            </div>
          </div>
        ) : (
          // Simulated CCTV Feed
          <>
            {/* Unsplash Image with dark surveillance grading */}
            <img
              src={imageUrl}
              alt={camera.name}
              className={cn(
                "w-full h-full object-cover brightness-[0.75] contrast-[1.05] saturate-[0.85] transition-transform duration-500",
                isHovered && "scale-[1.02]"
              )}
            />
            
            {/* CCTV Scanline HUD Layer */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Scanlines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] opacity-75" />
              {/* Vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.4)_100%)]" />
              {/* Intermittent signal noise simulation */}
              <div 
                className="absolute inset-0 opacity-[0.02]" 
                style={{
                  backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\"/%3E%3C/svg%3E')"
                }}
              />
            </div>

            {/* CCTV HUD Details (Top & Bottom Overlays) */}
            <div className="absolute inset-0 p-3 font-mono text-[10px] text-emerald-400/90 flex flex-col justify-between pointer-events-none">
              {/* Top HUD */}
              <div className="flex items-start justify-between w-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold tracking-wider">
                    {camera.status === "recording" ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        <span className="text-red-500">REC</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>LIVE</span>
                      </>
                    )}
                  </div>
                  <div>ID: {camera.id.toUpperCase()}</div>
                </div>
                
                <div className="text-right space-y-1">
                  <div>FPS: {camera.fps}</div>
                  <div>SIG: {camera.dbm} dBm</div>
                </div>
              </div>

              {/* Bottom HUD */}
              <div className="flex items-end justify-between w-full">
                <div className="space-y-0.5">
                  <div className="font-semibold text-xs tracking-tight text-white/90 truncate max-w-[150px]">
                    {camera.name.toUpperCase()}
                  </div>
                  <div>IP: {camera.ip}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    {timestamp}
                  </div>
                  {/* Fullscreen Button */}
                  {!hideExpand && (
                    <Link href={`/view/${camera.id}`} className="pointer-events-auto">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="size-7 border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:text-emerald-400 hover:bg-zinc-900 hover:border-emerald-500/50 rounded-md cursor-pointer transition-colors"
                        title="Fullscreen Stream"
                      >
                        <Expand className="size-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
