"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Columns,
  Rows,
  Maximize2,
  Minimize2,
  Tv,
  Eye,
  Sparkles,
  Wifi,
  RefreshCw,
  Flashlight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { getCameras, toggleFlash } from "@/lib/api";

// Security camera configurations
const TOKEN =
  "fd70b9def358ed9d30406a5a63b0e6d725863f09f801291e0952399e1b8ddb85";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

interface Camera {
  id: string;
  name: string;
  type: "real" | "fake";
  unsplashUrl?: string;
  /** For real cameras: the actual DB id used in the stream URL */
  dbId?: string;
  flash_active?: boolean;
  last_seen?: string | null;
}

// Static fake cameras - always shown to fill the grid
const FAKE_CAMERAS: Camera[] = [
  {
    id: "fake-1",
    name: "CAM-02 (Corredor A)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1520038410233-7141be7e6f97?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fake-2",
    name: "CAM-03 (Entrada Principal)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fake-3",
    name: "CAM-04 (Sala de Servidores)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fake-4",
    name: "CAM-05 (Escritório Central)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fake-5",
    name: "CAM-06 (Parque de Estacionamento)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fake-6",
    name: "CAM-07 (Cais de Descarga)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fake-7",
    name: "CAM-08 (Corredor de Segurança)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1518364538800-6bcb3f25da49?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "fake-8",
    name: "CAM-09 (Via Pública)",
    type: "fake",
    unsplashUrl:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80",
  },
];

// Layout definition types
type LayoutNode =
  | {
      id: string;
      type: "leaf";
      cameraId: string | null;
    }
  | {
      id: string;
      type: "group";
      direction: "horizontal" | "vertical";
      children: LayoutNode[];
    };

interface EffectSettings {
  colorMode: "normal" | "night-vision" | "amber" | "thermal";
}

// Preset layouts
const PRESETS: Record<string, LayoutNode> = {
  "1x1": { id: "root", type: "leaf", cameraId: "real-1" },
  "2x2": {
    id: "root-2x2",
    type: "group",
    direction: "vertical",
    children: [
      {
        id: "r1",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "c1", type: "leaf", cameraId: "real-1" },
          { id: "c2", type: "leaf", cameraId: "fake-1" },
        ],
      },
      {
        id: "r2",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "c3", type: "leaf", cameraId: "fake-2" },
          { id: "c4", type: "leaf", cameraId: "fake-3" },
        ],
      },
    ],
  },
  "3x3": {
    id: "root-3x3",
    type: "group",
    direction: "vertical",
    children: [
      {
        id: "row1",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "grid1", type: "leaf", cameraId: "real-1" },
          { id: "grid2", type: "leaf", cameraId: "fake-1" },
          { id: "grid3", type: "leaf", cameraId: "fake-2" },
        ],
      },
      {
        id: "row2",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "grid4", type: "leaf", cameraId: "fake-3" },
          { id: "grid5", type: "leaf", cameraId: "fake-4" },
          { id: "grid6", type: "leaf", cameraId: "fake-5" },
        ],
      },
      {
        id: "row3",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "grid7", type: "leaf", cameraId: "fake-6" },
          { id: "grid8", type: "leaf", cameraId: "fake-7" },
          { id: "grid9", type: "leaf", cameraId: "fake-8" },
        ],
      },
    ],
  },
  "1+3": {
    id: "root-1p3",
    type: "group",
    direction: "horizontal",
    children: [
      { id: "large-left", type: "leaf", cameraId: "real-1" },
      {
        id: "right-stack",
        type: "group",
        direction: "vertical",
        children: [
          { id: "stack1", type: "leaf", cameraId: "fake-1" },
          { id: "stack2", type: "leaf", cameraId: "fake-2" },
          { id: "stack3", type: "leaf", cameraId: "fake-3" },
        ],
      },
    ],
  },
};

// Tree manipulation helpers
function updateLeafCamera(
  node: LayoutNode,
  targetId: string,
  cameraId: string | null,
): LayoutNode {
  if (node.type === "leaf") {
    return node.id === targetId ? { ...node, cameraId } : node;
  }
  return {
    ...node,
    children: node.children.map((child) =>
      updateLeafCamera(child, targetId, cameraId),
    ),
  };
}

function splitLeafNode(
  node: LayoutNode,
  targetId: string,
  direction: "horizontal" | "vertical",
): LayoutNode {
  if (node.type === "leaf") {
    if (node.id === targetId) {
      const uniqueId1 = `leaf-${Math.random().toString(36).substr(2, 9)}`;
      const uniqueId2 = `leaf-${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: `group-${Math.random().toString(36).substr(2, 9)}`,
        type: "group",
        direction,
        children: [
          { id: uniqueId1, type: "leaf", cameraId: node.cameraId },
          { id: uniqueId2, type: "leaf", cameraId: null },
        ],
      };
    }
    return node;
  }
  return {
    ...node,
    children: node.children.map((child) =>
      splitLeafNode(child, targetId, direction),
    ),
  };
}

function deleteLeafNode(node: LayoutNode, targetId: string): LayoutNode {
  if (node.type === "leaf") {
    return node;
  }

  const hasTarget = node.children.some((child) => child.id === targetId);
  if (hasTarget) {
    const remaining = node.children.filter((child) => child.id !== targetId);
    if (remaining.length === 1) {
      return remaining[0];
    }
    return {
      ...node,
      children: remaining,
    };
  }

  return {
    ...node,
    children: node.children.map((child) => deleteLeafNode(child, targetId)),
  };
}

function countLeaves(node: LayoutNode): number {
  if (node.type === "leaf") return 1;
  return node.children.reduce((acc, child) => acc + countLeaves(child), 0);
}

function findCameraId(node: LayoutNode, targetId: string): string | null {
  if (node.type === "leaf") {
    return node.id === targetId ? node.cameraId : null;
  }
  for (const child of node.children) {
    const found = findCameraId(child, targetId);
    if (found !== null) return found;
  }
  return null;
}

export default function LivePage() {
  const [layout, setLayout] = useState<LayoutNode>(PRESETS["2x2"]);
  const [layoutType, setLayoutType] = useState<string>("2x2");
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);

  // Custom video visual effects
  const [effects, setEffects] = useState<EffectSettings>({
    colorMode: "normal",
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Real cameras fetched from DB - prepended to the static fake list
  const [realCameras, setRealCameras] = useState<Camera[]>([]);
  const availableCameras: Camera[] = [...realCameras, ...FAKE_CAMERAS];

  // Fetch real cameras from DB on mount and poll every 5 seconds to keep states in sync
  useEffect(() => {
    const fetchCams = () => {
      getCameras()
        .then((dbCams) => {
          const mapped: Camera[] = dbCams.map((c) => ({
            id: `real-db-${c.id}`,
            dbId: c.id,
            name: c.name,
            type: "real" as const,
            flash_active: c.flash_active === true || c.flash_active === 1,
            last_seen: c.last_seen,
          }));
          setRealCameras(mapped);
        })
        .catch(() => {
          // Backend unreachable - silently fall back to fakes or keep existing
        });
    };

    fetchCams(); // Initial load
    const interval = setInterval(fetchCams, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleFlash = async (dbId: string) => {
    const cam = realCameras.find((c) => c.dbId === dbId);
    if (!cam) return;
    const previousState = cam.flash_active;

    // Optimistic UI update
    setRealCameras((prev) =>
      prev.map((c) =>
        c.dbId === dbId ? { ...c, flash_active: !previousState } : c
      )
    );

    try {
      const res = await toggleFlash(dbId);
      setRealCameras((prev) =>
        prev.map((c) =>
          c.dbId === dbId ? { ...c, flash_active: res.flash_active } : c
        )
      );
    } catch (err) {
      console.error("Failed to toggle flash", err);
      // Revert state on error
      setRealCameras((prev) =>
        prev.map((c) =>
          c.dbId === dbId ? { ...c, flash_active: previousState } : c
        )
      );
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem("camron_live_layout");
    const savedType = localStorage.getItem("camron_live_layout_type");
    const savedEffects = localStorage.getItem("camron_live_effects");

    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (e) {
        console.error("Failed to parse saved layout", e);
      }
    }
    if (savedType) {
      setLayoutType(savedType);
    }
    if (savedEffects) {
      try {
        setEffects(JSON.parse(savedEffects));
      } catch (e) {
        console.error("Failed to parse saved effects", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("camron_live_layout", JSON.stringify(layout));
    localStorage.setItem("camron_live_layout_type", layoutType);
    localStorage.setItem("camron_live_effects", JSON.stringify(effects));
  }, [layout, layoutType, effects, isLoaded]);

  const handleApplyPreset = (type: string) => {
    setLayout(PRESETS[type]);
    setLayoutType(type);
    setFullscreenId(null);
  };

  const handleSelectCamera = (nodeId: string, cameraId: string | null) => {
    setLayout((prev) => updateLeafCamera(prev, nodeId, cameraId));
  };

  const handleSplit = (
    nodeId: string,
    direction: "horizontal" | "vertical",
  ) => {
    setLayout((prev) => splitLeafNode(prev, nodeId, direction));
    setLayoutType("custom");
  };

  const handleDelete = (nodeId: string) => {
    setLayout((prev) => deleteLeafNode(prev, nodeId));
    setLayoutType("custom");
  };

  // Color Filter CSS generator
  const getColorFilterStyle = () => {
    switch (effects.colorMode) {
      case "night-vision":
        return "contrast(1.2) brightness(0.85) sepia(1) hue-rotate(85deg) saturate(1.8)";
      case "amber":
        return "contrast(1.25) brightness(0.9) sepia(1) hue-rotate(-25deg) saturate(1.6)";
      case "thermal":
        return "invert(1) hue-rotate(185deg) saturate(2.3) contrast(1.4)";
      default:
        return "none";
    }
  };

  // Main Recursive Layout Renderer
  const renderLayout = (node: LayoutNode): React.ReactNode => {
    if (node.type === "leaf") {
      return (
        <CameraCell
          nodeId={node.id}
          cameraId={node.cameraId}
          cameras={availableCameras}
          onSelectCamera={(camId) => handleSelectCamera(node.id, camId)}
          onSplit={(dir) => handleSplit(node.id, dir)}
          onDelete={() => handleDelete(node.id)}
          isDeleteDisabled={countLeaves(layout) <= 1}
          onToggleFullscreen={() =>
            setFullscreenId(fullscreenId === node.id ? null : node.id)
          }
          isFullscreen={fullscreenId === node.id}
          effects={effects}
          filterStyle={getColorFilterStyle()}
          onToggleFlash={handleToggleFlash}
        />
      );
    }

    return (
      <ResizablePanelGroup direction={node.direction} className="h-full w-full">
        {node.children.map((child, index) => (
          <React.Fragment key={child.id}>
            <ResizablePanel defaultSize={100 / node.children.length}>
              {renderLayout(child)}
            </ResizablePanel>
            {index < node.children.length - 1 && (
              <ResizableHandle
                withHandle
                className="bg-zinc-800 hover:bg-zinc-700 transition-colors"
              />
            )}
          </React.Fragment>
        ))}
      </ResizablePanelGroup>
    );
  };

  return (
    <div className="flex flex-col gap-2 p-1 h-full flex-1 overflow-hidden">
      {!isLoaded ? (
        <div className="flex-1 flex items-center justify-center bg-zinc-950">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <>
          <div className="flex flex-row items-center justify-between shrink-0 px-2 pt-1 gap-2">
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                Mosaico
              </h1>
            </div>

            {/* Preset selectors and filter controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg shrink-0">
                {(["1x1", "2x2", "3x3", "1+3"] as const).map((preset) => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={layoutType === preset ? "default" : "ghost"}
                    className={`h-6 text-[10px] px-2 rounded-md ${
                      layoutType === preset
                        ? "bg-zinc-800 text-white hover:bg-zinc-700"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] gap-1 px-2 border-zinc-800 text-zinc-400 hover:text-white bg-zinc-900 capitalize shrink-0"
                  >
                    <Eye className="h-3 w-3" />
                    <span className="hidden sm:inline">Visual:</span>{" "}
                    {effects.colorMode === "normal"
                      ? "Normal"
                      : effects.colorMode}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-zinc-950 border-zinc-850 text-white"
                >
                  <DropdownMenuItem
                    className="hover:bg-zinc-900 focus:bg-zinc-900"
                    onClick={() =>
                      setEffects((prev) => ({ ...prev, colorMode: "normal" }))
                    }
                  >
                    Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-zinc-900 focus:bg-zinc-900"
                    onClick={() =>
                      setEffects((prev) => ({
                        ...prev,
                        colorMode: "night-vision",
                      }))
                    }
                  >
                    Visão Noturna
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-zinc-900 focus:bg-zinc-900"
                    onClick={() =>
                      setEffects((prev) => ({ ...prev, colorMode: "amber" }))
                    }
                  >
                    Amber
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-zinc-900 focus:bg-zinc-900"
                    onClick={() =>
                      setEffects((prev) => ({ ...prev, colorMode: "thermal" }))
                    }
                  >
                    Térmico
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main Grid Viewport Wrapper */}
          <div className="flex-1 overflow-hidden min-h-0 relative shadow-2xl">
            {fullscreenId ? (
              <div className="absolute inset-0 z-40 bg-zinc-950 p-1 h-full w-full">
                <CameraCell
                  nodeId={fullscreenId}
                  cameraId={findCameraId(layout, fullscreenId)}
                  cameras={availableCameras}
                  onSelectCamera={(camId) =>
                    handleSelectCamera(fullscreenId, camId)
                  }
                  onSplit={(dir) => handleSplit(fullscreenId, dir)}
                  onDelete={() => handleDelete(fullscreenId)}
                  isDeleteDisabled={true}
                  onToggleFullscreen={() => setFullscreenId(null)}
                  isFullscreen={true}
                  effects={effects}
                  filterStyle={getColorFilterStyle()}
                  onToggleFlash={handleToggleFlash}
                />
              </div>
            ) : (
              renderLayout(layout)
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Single Camera Cell Component
interface CameraCellProps {
  nodeId: string;
  cameraId: string | null;
  cameras: Camera[];
  onSelectCamera: (cameraId: string | null) => void;
  onSplit: (direction: "horizontal" | "vertical") => void;
  onDelete: () => void;
  isDeleteDisabled: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  effects: EffectSettings;
  filterStyle: string;
  onToggleFlash: (dbId: string) => void;
}

function CameraCell({
  nodeId,
  cameraId,
  cameras,
  onSelectCamera,
  onSplit,
  onDelete,
  isDeleteDisabled,
  onToggleFullscreen,
  isFullscreen,
  effects,
  filterStyle,
  onToggleFlash,
}: CameraCellProps) {
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Resolve camera ID with support for legacy "real-1" mapping to first real camera
  let camera = cameras.find((c) => c.id === cameraId);
  if (!camera && cameraId === "real-1") {
    camera = cameras.find((c) => c.type === "real");
  }

  useEffect(() => {
    setIsLive(false);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [cameraId]);

  if (!cameraId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center group transition-all duration-300 relative border border-zinc-900/50 hover:border-zinc-800/80 select-none animate-fade-in">
        {/* Stylized background matrix lines */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="flex flex-col items-center gap-3 z-10 max-w-[320px]">
          <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-105 group-hover:border-zinc-700 transition-all duration-300 shadow-md">
            <Plus className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-300">
              Sem Sinal de Vídeo
            </h3>
            <p className="text-xs text-zinc-500">
              Mapeie um feed de câmara a este painel ou use as opções de divisão
              abaixo.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-xs h-8 transition-colors"
              >
                Mapear Feed
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-zinc-850 text-white w-56">
              {cameras.map((cam) => (
                <DropdownMenuItem
                  key={cam.id}
                  className="hover:bg-zinc-900 focus:bg-zinc-900 text-xs py-2 cursor-pointer transition-colors"
                  onClick={() => onSelectCamera(cam.id)}
                >
                  {cam.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Small split overlay controls for empty node */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-xs p-1 rounded-md border border-zinc-800">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            onClick={() => onSplit("horizontal")}
            title="Dividir Horizontal"
          >
            <Columns className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            onClick={() => onSplit("vertical")}
            title="Dividir Vertical"
          >
            <Rows className="h-3.5 w-3.5" />
          </Button>
          {!isDeleteDisabled && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors"
              onClick={onDelete}
              title="Remover Painel"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black group border border-zinc-900 select-none animate-fade-in">
      {/* Video Content / Placeholder */}
      <div
        className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden transition-all"
        style={{ filter: filterStyle }}
      >
        {!camera ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center gap-2">
            <AlertCircle className="h-6 w-6 text-zinc-500" />
            <span className="text-zinc-400 font-mono text-xs">
              Câmara não configurada
            </span>
            <p className="text-[10px] text-zinc-600 max-w-[180px] font-mono">
              ID: {cameraId}
            </p>
          </div>
        ) : camera.type === "real" ? (
          <img
            src={`${BACKEND_URL}/stream?id=${camera.dbId}&token=${TOKEN}&r=${retryCount}`}
            alt={camera.name}
            className={`w-full h-full object-contain transition-opacity duration-300 ease-out ${
              isLive ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => {
              setIsLive(true);
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLive(false);
              setIsLoading(false);
              setHasError(true);
            }}
          />
        ) : (
          <img
            src={`${camera.unsplashUrl}&r=${retryCount}`}
            alt={camera.name}
            className={`w-full h-full object-contain transition-opacity duration-300 ease-out ${
              isLive ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => {
              setIsLive(true);
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLive(false);
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}

        {camera && isLoading && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
            <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
            <div className="z-10 flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              <span className="text-[10px] tracking-widest text-zinc-500/80 uppercase font-mono">
                Carregar sinal...
              </span>
            </div>
          </div>
        )}

        {camera && hasError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-4 text-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500/80" />
            <span className="text-[11px] font-semibold text-zinc-400 font-mono tracking-wider">
              LIGAÇÃO INTERROMPIDA
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white mt-1 h-7 text-[10px] transition-colors"
              onClick={() => {
                setIsLoading(true);
                setHasError(false);
                setIsLive(false);
                setRetryCount((prev) => prev + 1);
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>

      {/* Top Left - Camera Name info (Clean glass pill style) */}
      {camera && isLive && (
        <div className="absolute top-3 left-3 bg-zinc-950/70 backdrop-blur-md text-zinc-200 border border-zinc-800/40 text-[10px] px-2.5 py-1 rounded-md font-mono tracking-wide uppercase select-none z-20">
          {camera.name.toUpperCase()}
        </div>
      )}

      {/* Hover Toolbar Controls Overlay - Docked in the bottom-right, matching the empty cell toolbar style */}
      <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out flex items-center gap-1 bg-zinc-900/90 backdrop-blur-xs p-1 rounded-md border border-zinc-800 shadow-md">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors rounded"
            >
              Mudar Feed
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-950 border border-zinc-800 text-white w-52 rounded-md">
            {cameras.map((cam) => (
              <DropdownMenuItem
                key={cam.id}
                className="hover:bg-zinc-900 focus:bg-zinc-900 text-xs py-2 cursor-pointer transition-colors"
                onClick={() => onSelectCamera(cam.id)}
              >
                {cam.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="hover:bg-zinc-900 focus:bg-zinc-900 text-xs py-2 cursor-pointer text-red-400 focus:text-red-400 transition-colors"
              onClick={() => onSelectCamera(null)}
            >
              Desconectar Canal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {camera && camera.type === "real" && (
          <>
            <div className="w-px h-3.5 bg-zinc-800" />
            <Button
              size="icon"
              variant="ghost"
              disabled={!camera.last_seen || (Date.now() - new Date(camera.last_seen).getTime()) / 1000 >= 10}
              className={`h-6 w-6 rounded transition-colors ${
                camera.flash_active
                  ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={() => onToggleFlash(camera.dbId || "")}
              title={camera.flash_active ? "Desligar Lanterna" : "Ligar Lanterna"}
            >
              <Flashlight className="h-3.5 w-3.5" />
            </Button>
          </>
        )}

        <div className="w-px h-3.5 bg-zinc-800" />

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          onClick={() => onSplit("horizontal")}
          title="Dividir Horizontal"
        >
          <Columns className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          onClick={() => onSplit("vertical")}
          title="Dividir Vertical"
        >
          <Rows className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Restaurar" : "Maximizar"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>

        {!isDeleteDisabled && (
          <>
            <div className="w-px h-3.5 bg-zinc-800" />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded transition-colors"
              onClick={onDelete}
              title="Eliminar Painel"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
