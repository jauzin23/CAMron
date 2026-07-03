"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { AuroraText } from "@/components/ui/aurora-text";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { StatusDot } from "@/components/ui/status-dot";
import { RainbowButton } from "@/components/ui/rainbow-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import {
  Lightbulb,
  LightbulbOff,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit2,
  Plus,
  Loader2,
  Cpu,
} from "lucide-react";
import { getCameras, deleteCamera, toggleFlash, type Camera } from "@/lib/api";
import { useDevice } from "@/lib/device-context";
import { useLanguage } from "@/lib/language-context";

function formatDateTime(value: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-US", {
    dateStyle: "short",
  }).format(new Date(value));
}

// Derive online/offline status from last_seen timestamp
function getCameraStatus(
  camera: Camera,
): "online" | "offline" | "unconfigured" {
  if (!camera.wifi_ssid) return "unconfigured";
  if (!camera.last_seen) return "offline";
  const diffSeconds =
    (Date.now() - new Date(camera.last_seen).getTime()) / 1000;
  return diffSeconds < 10 ? "online" : "offline";
}

export default function ControlCenterPage() {
  const router = useRouter();
  const { isDesktop } = useDevice();
  const { t, language } = useLanguage();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);

  // Load cameras from API
  const loadCameras = useCallback(
    async (showLoading = true) => {
      if (showLoading) setCamerasLoading(true);
      try {
        const data = await getCameras();
        setCameras(data);
      } catch (err) {
        if (showLoading) toast.error(t("dashboard.loadCamerasError"));
      } finally {
        if (showLoading) setCamerasLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadCameras(true);

    const sseToken = sessionStorage.getItem("camron_jwt") ?? "";
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const eventSource = new EventSource(
      `${backendUrl}/api/cameras/events?token=${encodeURIComponent(sseToken)}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setCameras(data);
        setCamerasLoading(false);
      } catch (err) {
        console.error("Failed to parse cameras SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Cameras SSE connection error:", err);
    };

    // Refresh status when the tab gets focused
    const handleFocus = () => {
      void loadCameras(false);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      eventSource.close();
    };
  }, [loadCameras]);

  const handleCopyIP = (ip: string, name: string) => {
    if (!ip) {
      toast.error(t("dashboard.cameraNoIpError", { name }));
      return;
    }
    navigator.clipboard.writeText(ip);
    toast.success(`${t("dashboard.ipCopied")} (${ip})`);
  };

  const handleCopyID = (id: string, name: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`${t("common.success")} (ID: ${name})`);
  };

  const handleDelete = async (id: string, name: string) => {
    // Optimistic update
    setCameras((prev) => prev.filter((c) => c.id !== id));

    try {
      await deleteCamera(id);
      toast.success(t("common.success"));
      void loadCameras(false);
    } catch {
      toast.error(t("common.error"));
      void loadCameras(false);
    }
  };

  const handleToggleFlash = async (camera: Camera) => {
    // Optimistic update
    const previousState = camera.flash_active;
    setCameras((prev) =>
      prev.map((c) =>
        c.id === camera.id ? { ...c, flash_active: !previousState } : c,
      ),
    );

    try {
      const result = await toggleFlash(camera.id);
      toast.success(
        result.flash_active
          ? `${camera.name}: ${t("dashboard.flashActive")}`
          : `${camera.name}: ${t("dashboard.flashInactive")}`,
      );

      setCameras((prev) =>
        prev.map((c) =>
          c.id === camera.id ? { ...c, flash_active: result.flash_active } : c,
        ),
      );
    } catch {
      toast.error(t("common.error"));
      // Revert on error
      setCameras((prev) =>
        prev.map((c) =>
          c.id === camera.id ? { ...c, flash_active: previousState } : c,
        ),
      );
    }
  };

  const columns: ColumnDef<Camera>[] = [
    {
      accessorKey: "name",
      header: () => <div className="pl-2">{t("dashboard.subtitle")}</div>,
      cell: ({ row }) => {
        const camera = row.original;
        return (
          <div className="flex flex-col gap-1 pl-2">
            <span className="font-sans font-semibold text-sm text-foreground">
              {camera.name}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("dashboard.statusLabel"),
      cell: ({ row }) => {
        const status = getCameraStatus(row.original);
        if (status === "unconfigured") {
          return (
            <div className="flex items-center gap-2">
              <StatusDot variant="warning" size="md" />
              <span className="font-semibold text-amber-500">
                {t("dashboard.statusUnconfigured")}
              </span>
            </div>
          );
        }
        const isOnline = status === "online";
        return (
          <div className="flex items-center gap-2">
            <StatusDot variant={isOnline ? "success" : "muted"} size="md" />
            <span
              className={cn(
                "font-semibold",
                isOnline ? "text-emerald-400" : "text-zinc-500",
              )}
            >
              {isOnline
                ? t("dashboard.statusOnline")
                : t("dashboard.statusOffline")}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => {
        const ip = row.getValue("ip") as string;
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {ip || "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "flash_active",
      header: t("live.toggleFlash"),
      cell: ({ row }) => {
        const camera = row.original;
        const status = getCameraStatus(camera);
        if (status === "unconfigured") {
          return (
            <Button
              size="sm"
              variant="outline"
              className={cn("h-7 text-xs px-2", isDesktop && "cursor-pointer")}
              onClick={() =>
                isDesktop && router.push(`/cameras/flash?id=${camera.id}`)
              }
              disabled={!isDesktop}
              title={!isDesktop ? t("restricted.descNew") : undefined}
            >
              <Cpu className="h-3.5 w-3.5 mr-1" />
              {t("wizard.flash")}
            </Button>
          );
        }
        const active = camera.flash_active;
        const isOffline = status === "offline";
        const isDisabled = isOffline;
        return (
          <button
            onClick={() => !isDisabled && handleToggleFlash(camera)}
            disabled={isDisabled}
            className={cn(
              "overflow-hidden rounded-full transition-transform",
              isDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer active:scale-95",
            )}
            title={
              isOffline ? t("dashboard.statusOffline") : t("live.toggleFlash")
            }
          >
            <div
              className={cn(
                "relative inline-flex items-center justify-center w-[96px] h-[22px] rounded-full border text-xs font-semibold select-none transition-all duration-300",
                active
                  ? "border-zinc-200/30 bg-zinc-200/15 text-zinc-100 shadow-[0_0_8px_rgba(228,228,231,0.15)]"
                  : "border-zinc-800 bg-zinc-950 text-zinc-500 shadow-none",
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {active ? (
                  <motion.div
                    key="on"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-1.5"
                  >
                    <Lightbulb className="h-3.5 w-3.5 fill-current -mt-[1px]" />
                    <span className="leading-none mt-[1px]">
                      {t("dashboard.flashActive")}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="off"
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-1.5"
                  >
                    <LightbulbOff className="h-3.5 w-3.5 -mt-[1px]" />
                    <span className="leading-none mt-[1px]">
                      {t("dashboard.flashInactive")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: t("dashboard.activityLabel"),
      cell: ({ row }) => {
        const dateStr = row.getValue("created_at") as string;
        return (
          <span className="text-muted-foreground">
            {formatDateTime(dateStr, language)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => (
        <div className="text-right pr-2">{t("dashboard.actionsLabel")}</div>
      ),
      cell: ({ row }) => {
        const camera = row.original;
        const status = getCameraStatus(camera);
        const isOffline = status === "offline";
        return (
          <div className="text-right pr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-zinc-800"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[8rem] bg-zinc-950 border border-border/80 text-zinc-200"
              >
                <DropdownMenuItem
                  onClick={() => handleCopyID(camera.id, camera.name)}
                  className="cursor-pointer gap-2 font-mono text-xs focus:bg-zinc-900 focus:text-zinc-50"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("dashboard.copyId")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCopyIP(camera.ip, camera.name)}
                  disabled={!camera.ip}
                  className={cn(
                    "gap-2 font-mono text-xs focus:bg-zinc-900 focus:text-zinc-50",
                    !camera.ip ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("dashboard.copyIp")}</span>
                </DropdownMenuItem>

                {!(status === "unconfigured") && (
                  <DropdownMenuItem
                    onClick={() => !isOffline && handleToggleFlash(camera)}
                    disabled={isOffline}
                    className={cn(
                      "cursor-pointer gap-2 text-xs focus:bg-zinc-900 focus:text-zinc-50",
                      isOffline && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {camera.flash_active ? (
                      <>
                        <LightbulbOff className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{t("dashboard.flashInactive")}</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{t("dashboard.flashActive")}</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem
                  onClick={() =>
                    isDesktop && router.push(`/cameras/flash?id=${camera.id}`)
                  }
                  disabled={!isDesktop}
                  className={cn(
                    "gap-2 text-xs focus:bg-zinc-900",
                    !isDesktop
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer",
                  )}
                  title={!isDesktop ? t("restricted.descNew") : undefined}
                >
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("wizard.flash")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/cameras/edit?id=${camera.id}`)}
                  className="cursor-pointer gap-2 text-xs focus:bg-zinc-900"
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("dashboard.editCamera")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(camera.id, camera.name)}
                  className="cursor-pointer gap-2 text-xs focus:bg-zinc-900 text-rose-500 focus:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500/70" />
                  <span>{t("dashboard.deleteCamera")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{t("dashboard.welcomeTo")}</span>
            <AuroraText>{t("dashboard.title")}</AuroraText>
          </div>
        }
        description={t("dashboard.description")}
      />

      <div className="flex flex-col gap-4">
        <DataTable
          columns={columns}
          data={cameras}
          isLoading={camerasLoading}
          filterColumnKey="name"
          filterPlaceholder={t("dashboard.searchPlaceholder")}
          actionButton={
            <RainbowButton
              className={cn(
                "h-9 gap-2 font-medium w-full sm:w-auto",
                !isDesktop || camerasLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer",
              )}
              variant="outline"
              onClick={() => isDesktop && router.push("/cameras/new")}
              disabled={camerasLoading || !isDesktop}
            >
              <Plus />
              {t("dashboard.buttonAddCamera")}
            </RainbowButton>
          }
        />
      </div>
    </div>
  );
}
