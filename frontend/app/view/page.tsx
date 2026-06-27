"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Tv, 
  VideoOff, 
  Columns3, 
  Columns2, 
  Eye, 
  PanelLeftClose, 
  ArrowLeft 
} from "lucide-react";
import { cameras } from "@/lib/cameras";
import { CameraStream } from "@/components/camera-stream";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

type LayoutPreset = "3x2" | "2x3" | "1+2" | "solo";

export default function Page() {
  const [layoutMode, setLayoutMode] = useState<LayoutPreset>("3x2");
  const [visibleCameras, setVisibleCameras] = useState<Record<string, boolean>>({});
  const [onlyOnline, setOnlyOnline] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [time, setTime] = useState("");

  // Live system clock for surveillance validation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize camera visibility
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("camron_cctv_layout_mode") as LayoutPreset;
      const savedOnline = localStorage.getItem("camron_cctv_only_online");
      const savedVisible = localStorage.getItem("camron_cctv_visible");

      if (savedMode) setLayoutMode(savedMode);
      if (savedOnline) setOnlyOnline(savedOnline === "true");

      let parsedVisible: Record<string, boolean> = {};
      if (savedVisible) {
        try {
          parsedVisible = JSON.parse(savedVisible);
        } catch {
          parsedVisible = {};
        }
      }

      // Merge with defaults
      const initialVisible: Record<string, boolean> = {};
      cameras.forEach(cam => {
        initialVisible[cam.id] = parsedVisible[cam.id] !== undefined ? parsedVisible[cam.id] : true;
      });

      setVisibleCameras(initialVisible);
      setIsLoaded(true);
    }
  }, []);

  // Save changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("camron_cctv_layout_mode", layoutMode);
      localStorage.setItem("camron_cctv_only_online", String(onlyOnline));
      localStorage.setItem("camron_cctv_visible", JSON.stringify(visibleCameras));
    }
  }, [layoutMode, onlyOnline, visibleCameras, isLoaded]);

  const toggleVisibility = (id: string) => {
    setVisibleCameras(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter and get active cameras
  const activeCameras = cameras.filter(cam => {
    if (!visibleCameras[cam.id]) return false;
    if (onlyOnline && cam.status === "offline") return false;
    return true;
  });

  const renderLayout = () => {
    if (activeCameras.length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-black">
          <VideoOff className="size-10 text-zinc-700 mb-3 animate-pulse" />
          <h3 className="text-zinc-400 font-semibold text-sm font-mono">NO ACTIVE CAMERA STREAMS</h3>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs font-mono">
            Toggle visible channels in feeds menu or check network profiles.
          </p>
        </div>
      );
    }

    if (activeCameras.length === 1 || layoutMode === "solo") {
      return (
        <div className="w-full h-full bg-black">
          <CameraStream camera={activeCameras[0]} />
        </div>
      );
    }

    // Dynamic grid mapping based on preset and active feeds
    if (layoutMode === "3x2") {
      const col1 = activeCameras.slice(0, Math.ceil(activeCameras.length / 3));
      const col2 = activeCameras.slice(col1.length, col1.length + Math.ceil((activeCameras.length - col1.length) / 2));
      const col3 = activeCameras.slice(col1.length + col2.length);

      return (
        <ResizablePanelGroup direction="horizontal" className="w-full h-full bg-black">
          {col1.length > 0 && (
            <ResizablePanel defaultSize={33.3}>
              <ResizablePanelGroup direction="vertical">
                {col1.map((cam, i) => (
                  <React.Fragment key={cam.id}>
                    <ResizablePanel><CameraStream camera={cam} /></ResizablePanel>
                    {i < col1.length - 1 && <ResizableHandle withHandle />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
          )}
          
          {col2.length > 0 && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={33.3}>
                <ResizablePanelGroup direction="vertical">
                  {col2.map((cam, i) => (
                    <React.Fragment key={cam.id}>
                      <ResizablePanel><CameraStream camera={cam} /></ResizablePanel>
                      {i < col2.length - 1 && <ResizableHandle withHandle />}
                    </React.Fragment>
                  ))}
                </ResizablePanelGroup>
              </ResizablePanel>
            </>
          )}

          {col3.length > 0 && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={33.3}>
                <ResizablePanelGroup direction="vertical">
                  {col3.map((cam, i) => (
                    <React.Fragment key={cam.id}>
                      <ResizablePanel><CameraStream camera={cam} /></ResizablePanel>
                      {i < col3.length - 1 && <ResizableHandle withHandle />}
                    </React.Fragment>
                  ))}
                </ResizablePanelGroup>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      );
    }

    if (layoutMode === "2x3") {
      const mid = Math.ceil(activeCameras.length / 2);
      const col1 = activeCameras.slice(0, mid);
      const col2 = activeCameras.slice(mid);

      return (
        <ResizablePanelGroup direction="horizontal" className="w-full h-full bg-black">
          <ResizablePanel defaultSize={50}>
            <ResizablePanelGroup direction="vertical">
              {col1.map((cam, i) => (
                <React.Fragment key={cam.id}>
                  <ResizablePanel><CameraStream camera={cam} /></ResizablePanel>
                  {i < col1.length - 1 && <ResizableHandle withHandle />}
                </React.Fragment>
              ))}
            </ResizablePanelGroup>
          </ResizablePanel>
          
          {col2.length > 0 && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50}>
                <ResizablePanelGroup direction="vertical">
                  {col2.map((cam, i) => (
                    <React.Fragment key={cam.id}>
                      <ResizablePanel><CameraStream camera={cam} /></ResizablePanel>
                      {i < col2.length - 1 && <ResizableHandle withHandle />}
                    </React.Fragment>
                  ))}
                </ResizablePanelGroup>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      );
    }

    if (layoutMode === "1+2") {
      const mainCam = activeCameras[0];
      const sideCams = activeCameras.slice(1);

      return (
        <ResizablePanelGroup direction="horizontal" className="w-full h-full bg-black">
          <ResizablePanel defaultSize={66}>
            <CameraStream camera={mainCam} />
          </ResizablePanel>
          
          {sideCams.length > 0 && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={34}>
                <ResizablePanelGroup direction="vertical">
                  {sideCams.map((cam, i) => (
                    <React.Fragment key={cam.id}>
                      <ResizablePanel><CameraStream camera={cam} /></ResizablePanel>
                      {i < sideCams.length - 1 && <ResizableHandle withHandle />}
                    </React.Fragment>
                  ))}
                </ResizablePanelGroup>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      );
    }

    return null;
  };

  if (!isLoaded) return <div className="bg-black w-full h-full" />;

  return (
    <div className="w-full h-full relative overflow-hidden bg-zinc-950 flex flex-col">
      {/* Sleek Minimalist Header */}
      <header className="h-14 shrink-0 border-b border-zinc-900 bg-zinc-950 px-4 flex items-center justify-between select-none">
        {/* Left: Clean Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-zinc-500 hover:text-zinc-200 transition-colors">
            Devices
          </Link>
          <span className="text-zinc-800">/</span>
          <span className="text-zinc-200 font-medium">Live Wall</span>
        </div>

        {/* Center: Standard Layout Selector (Icon buttons) */}
        <div className="flex items-center gap-1 bg-zinc-900/40 p-0.5 rounded-lg border border-zinc-800/80">
          <Button
            variant={layoutMode === "3x2" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 cursor-pointer rounded-md transition-all"
            onClick={() => setLayoutMode("3x2")}
            title="3x2 Grid"
          >
            <Columns3 className="size-4 text-zinc-400" />
          </Button>
          <Button
            variant={layoutMode === "2x3" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 cursor-pointer rounded-md transition-all"
            onClick={() => setLayoutMode("2x3")}
            title="2x3 Grid"
          >
            <Columns2 className="size-4 text-zinc-400" />
          </Button>
          <Button
            variant={layoutMode === "1+2" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 cursor-pointer rounded-md transition-all"
            onClick={() => setLayoutMode("1+2")}
            title="Focus Layout"
          >
            <PanelLeftClose className="size-4 text-zinc-400" />
          </Button>
        </div>

        {/* Right: Actions & Clock */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
            {activeCameras.length} of {cameras.length} active
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 border-zinc-850 bg-zinc-900/30 hover:bg-zinc-900 text-xs text-zinc-300 rounded-lg cursor-pointer px-2.5"
              >
                <Tv className="size-3.5" />
                <span>Feeds</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-zinc-800 bg-zinc-950 rounded-xl">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-zinc-400 px-2 py-1.5 font-medium">Streams</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-900" />
                {cameras.map((cam) => (
                  <DropdownMenuCheckboxItem
                    key={cam.id}
                    checked={visibleCameras[cam.id]}
                    onCheckedChange={() => toggleVisibility(cam.id)}
                    className="cursor-pointer text-xs text-zinc-300 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{cam.name}</span>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full ml-2",
                        cam.status === "offline" ? "bg-zinc-600" :
                        cam.status === "recording" ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                      )} />
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator className="bg-zinc-900" />
                <DropdownMenuCheckboxItem
                  checked={onlyOnline}
                  onCheckedChange={(c) => setOnlyOnline(c as boolean)}
                  className="cursor-pointer text-xs text-zinc-300 py-2"
                >
                  Show Online Only
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-zinc-800" />

          <span className="text-xs font-mono text-zinc-400 select-all">{time}</span>
        </div>
      </header>

      {/* Main Grid Render */}
      <div className="flex-1 w-full h-full relative">
        {renderLayout()}
      </div>
    </div>
  );
}
