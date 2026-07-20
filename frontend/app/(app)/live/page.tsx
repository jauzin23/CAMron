"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

interface Camera {
  id: string;
  name: string;
  flash_active?: boolean;
  last_seen?: string | null;
}

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

const PRESETS: Record<string, LayoutNode> = {
  "1x1": { id: "root", type: "leaf", cameraId: null },
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
          { id: "c1", type: "leaf", cameraId: null },
          { id: "c2", type: "leaf", cameraId: null },
        ],
      },
      {
        id: "r2",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "c3", type: "leaf", cameraId: null },
          { id: "c4", type: "leaf", cameraId: null },
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
          { id: "grid1", type: "leaf", cameraId: null },
          { id: "grid2", type: "leaf", cameraId: null },
          { id: "grid3", type: "leaf", cameraId: null },
        ],
      },
      {
        id: "row2",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "grid4", type: "leaf", cameraId: null },
          { id: "grid5", type: "leaf", cameraId: null },
          { id: "grid6", type: "leaf", cameraId: null },
        ],
      },
      {
        id: "row3",
        type: "group",
        direction: "horizontal",
        children: [
          { id: "grid7", type: "leaf", cameraId: null },
          { id: "grid8", type: "leaf", cameraId: null },
          { id: "grid9", type: "leaf", cameraId: null },
        ],
      },
    ],
  },
  "1+3": {
    id: "root-1p3",
    type: "group",
    direction: "horizontal",
    children: [
      { id: "large-left", type: "leaf", cameraId: null },
      {
        id: "right-stack",
        type: "group",
        direction: "vertical",
        children: [
          { id: "stack1", type: "leaf", cameraId: null },
          { id: "stack2", type: "leaf", cameraId: null },
          { id: "stack3", type: "leaf", cameraId: null },
        ],
      },
    ],
  },
};

function fillLayoutWithRealCams(
  node: LayoutNode,
  cameras: Camera[],
): LayoutNode {
  let cameraIndex = 0;
  function traverse(n: LayoutNode): LayoutNode {
    if (n.type === "leaf") {
      const cam = cameras[cameraIndex];
      cameraIndex++;
      return {
        ...n,
        cameraId: cam ? cam.id : null,
      };
    }
    return {
      ...n,
      children: n.children.map(traverse),
    };
  }
  return traverse(node);
}

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
  const router = useRouter();
  const { t, language } = useLanguage();
  const [layout, setLayout] = useState<LayoutNode>(PRESETS["2x2"]);
  const [layoutType, setLayoutType] = useState<string>("2x2");
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);

  const [effects, setEffects] = useState<EffectSettings>({
    colorMode: "normal",
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasInitializedLayout, setHasInitializedLayout] = useState(false);

  const [realCameras, setRealCameras] = useState<Camera[]>([]);
  const availableCameras: Camera[] = realCameras;

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const eventSource = new EventSource(
      `${backendUrl}/api/cameras/events`,
      { withCredentials: true },
    );

    eventSource.onmessage = (event) => {
      try {
        const dbCams = JSON.parse(event.data);
        if (Array.isArray(dbCams)) {
          if (dbCams.length === 0) {
            router.push("/");
            return;
          }
          const mapped: Camera[] = dbCams.map((c: any) => ({
            id: c.id,
            name: c.name,
            flash_active:
              c.flash_active === true || (c.flash_active as any) === 1,
            last_seen: c.last_seen,
          }));
          setRealCameras(mapped);
        }
      } catch (err) {
        console.error("Failed to parse cameras SSE data in live view:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Cameras SSE connection error in live view:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (isLoaded && !hasInitializedLayout && realCameras.length > 0) {
      const filledLayout = fillLayoutWithRealCams(PRESETS["2x2"], realCameras);
      setLayout(filledLayout);
      setHasInitializedLayout(true);
    }
  }, [realCameras, isLoaded, hasInitializedLayout]);

  const handleToggleFlash = async (id: string) => {
    const cam = realCameras.find((c) => c.id === id);
    if (!cam) return;
    const previousState = cam.flash_active;

    setRealCameras((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, flash_active: !previousState } : c,
      ),
    );

    try {
      const res = await toggleFlash(id);
      setRealCameras((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, flash_active: res.flash_active } : c,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle flash", err);
      setRealCameras((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, flash_active: previousState } : c,
        ),
      );
    }
  };

  useEffect(() => {
    const savedLayout = localStorage.getItem("camron_live_layout");
    const savedType = localStorage.getItem("camron_live_layout_type");
    const savedEffects = localStorage.getItem("camron_live_effects");

    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
        setHasInitializedLayout(true);
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

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("camron_live_layout", JSON.stringify(layout));
    localStorage.setItem("camron_live_layout_type", layoutType);
    localStorage.setItem("camron_live_effects", JSON.stringify(effects));
  }, [layout, layoutType, effects, isLoaded]);

  const handleApplyPreset = (type: string) => {
    const basePreset = PRESETS[type];
    const filledLayout = fillLayoutWithRealCams(basePreset, realCameras);
    setLayout(filledLayout);
    setLayoutType(type);
    setFullscreenId(null);
    setHasInitializedLayout(true);
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
                {t("live.mosaic")}
              </h1>
            </div>

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
                    <span className="hidden sm:inline">
                      {t("live.visualLabel")}
                    </span>{" "}
                    {effects.colorMode === "normal"
                      ? t("live.colorModeNormal")
                      : effects.colorMode === "night-vision"
                        ? t("live.colorModeNightVision")
                        : effects.colorMode === "amber"
                          ? t("live.colorModeAmber")
                          : t("live.colorModeThermal")}
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
                    {t("live.colorModeNightVision")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-zinc-900 focus:bg-zinc-900"
                    onClick={() =>
                      setEffects((prev) => ({ ...prev, colorMode: "amber" }))
                    }
                  >
                    {t("live.colorModeAmber")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-zinc-900 focus:bg-zinc-900"
                    onClick={() =>
                      setEffects((prev) => ({ ...prev, colorMode: "thermal" }))
                    }
                  >
                    {t("live.colorModeThermal")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

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
  const { t, language } = useLanguage();
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [showControls, setShowControls] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setShowControls(false);
  };

  const camera = cameras.find((c) => c.id === cameraId);

  useEffect(() => {
    setIsLive(false);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [cameraId]);

  if (!cameraId) {
    return (
      <div
        tabIndex={0}
        onFocus={() => setShowControls(true)}
        onBlur={handleBlur}
        onClick={() => setShowControls((prev) => !prev)}
        className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center group transition-all duration-300 relative border border-zinc-900/50 hover:border-zinc-800/80 select-none animate-fade-in outline-none"
      >
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-3 z-10 max-w-[320px]"
        >
          <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-105 group-hover:border-zinc-700 transition-all duration-300 shadow-md">
            <Plus className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-300">
              {t("live.noVideoSignal")}
            </h3>
            <p className="text-xs text-zinc-500">{t("live.chooseFeed")}</p>
          </div>

          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-xs h-8 transition-colors"
              >
                {t("live.mapFeed")}
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

        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute bottom-2 right-2 transition-all duration-300 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-xs p-1 rounded-md border border-zinc-800",
            showControls || isDropdownOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            onClick={() => onSplit("horizontal")}
            title={t("live.splitHorizontally")}
          >
            <Columns className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            onClick={() => onSplit("vertical")}
            title={t("live.splitVertically")}
          >
            <Rows className="h-3.5 w-3.5" />
          </Button>
          {!isDeleteDisabled && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors"
              onClick={onDelete}
              title={t("live.removePanel")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isVisible = showControls || isDropdownOpen;

  return (
    <div
      tabIndex={0}
      onFocus={() => setShowControls(true)}
      onBlur={handleBlur}
      onClick={() => setShowControls((prev) => !prev)}
      className="relative w-full h-full overflow-hidden bg-black group border border-zinc-900 select-none animate-fade-in outline-none"
    >
      <div
        className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden transition-all"
        style={{ filter: filterStyle }}
      >
        {!camera ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center group transition-all duration-300">
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-3 z-10 max-w-[320px]"
            >
              <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-red-900/30 flex items-center justify-center group-hover:scale-105 transition-all duration-300 shadow-md">
                <AlertCircle className="h-5 w-5 text-red-500/80" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-red-400/90">
                  {t("live.cameraInaccessible")}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t("live.cameraInaccessibleDesc")}
                </p>
              </div>

              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white text-xs h-8 transition-colors"
                  onClick={() => onSelectCamera(null)}
                >
                  {t("live.clearPanel")}
                </Button>

                <DropdownMenu onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-white text-black hover:bg-zinc-200 text-xs h-8 transition-colors"
                    >
                      {t("live.mapFeed")}
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
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute bottom-2 right-2 transition-all duration-300 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-xs p-1 rounded-md border border-zinc-800",
                showControls || isDropdownOpen
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
            >
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                onClick={() => onSplit("horizontal")}
                title={t("live.splitHorizontally")}
              >
                <Columns className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                onClick={() => onSplit("vertical")}
                title={t("live.splitVertically")}
              >
                <Rows className="h-3.5 w-3.5" />
              </Button>
              {!isDeleteDisabled && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 hover:bg-zinc-800 rounded text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors"
                  onClick={onDelete}
                  title={t("live.removePanel")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <img
            src={`${BACKEND_URL}/stream?id=${camera.id}&r=${retryCount}`}
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
                {t("common.loading")}
              </span>
            </div>
          </div>
        )}

        {camera && hasError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-4 text-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500/80" />
            <span className="text-[11px] font-semibold text-zinc-400 font-mono tracking-wider">
              {t("live.connectionInterrupted")}
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
              {t("common.tryAgain")}
            </Button>
          </div>
        )}
      </div>

      {camera && isLive && (
        <div className="absolute top-3 left-3 bg-zinc-950/70 backdrop-blur-md text-zinc-200 border border-zinc-800/40 text-[10px] px-2.5 py-1 rounded-md font-mono tracking-wide uppercase select-none z-20">
          {camera.name.toUpperCase()}
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute bottom-2 right-2 z-30 transition-all duration-300 ease-out flex items-center gap-1 bg-zinc-900/90 backdrop-blur-xs p-1 rounded-md border border-zinc-800 shadow-md",
          isVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <DropdownMenu onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors rounded"
            >
              {t("live.changeFeed")}
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
              {t("live.disconnectFeed")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {camera && (
          <>
            <div className="w-px h-3.5 bg-zinc-800" />
            <Button
              size="icon"
              variant="ghost"
              disabled={
                !camera.last_seen ||
                (Date.now() - new Date(camera.last_seen).getTime()) / 1000 >= 10
              }
              className={`h-6 w-6 rounded transition-colors ${
                camera.flash_active
                  ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={() => onToggleFlash(camera.id)}
              title={
                camera.flash_active
                  ? t("live.flashlightOff")
                  : t("live.flashlightOn")
              }
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
          title={t("live.splitHorizontally")}
        >
          <Columns className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          onClick={() => onSplit("vertical")}
          title={t("live.splitVertically")}
        >
          <Rows className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          onClick={onToggleFullscreen}
          title={
            isFullscreen
              ? t("live.restore")
              : t("live.maximize")
          }
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
              title={t("live.removePanel")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
