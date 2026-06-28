"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AuroraText } from "@/components/ui/aurora-text";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { StatusDot } from "@/components/ui/status-dot";
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
import {
  getCameras,
  deleteCamera,
  toggleFlash,
  clienteMe,
  type Camera,
} from "@/lib/api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value));
}

// Derive online/offline status from last_seen timestamp
function getCameraStatus(camera: Camera): "online" | "offline" {
  if (!camera.last_seen) return "offline";
  const diffSeconds =
    (Date.now() - new Date(camera.last_seen).getTime()) / 1000;
  return diffSeconds < 60 ? "online" : "offline";
}

export default function ControlCenterPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [nameLoading, setNameLoading] = useState(true);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);

  // Load user display name
  useEffect(() => {
    void clienteMe()
      .then((me) => {
        setNome(me.nome_utilizador);
        setNameLoading(false);
      })
      .catch(() => setNameLoading(false));
  }, []);

  // Load cameras from API
  const loadCameras = useCallback(async () => {
    setCamerasLoading(true);
    try {
      const data = await getCameras();
      setCameras(data);
    } catch (err) {
      toast.error("Erro ao carregar câmaras. O backend está a correr?");
    } finally {
      setCamerasLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCameras();
  }, [loadCameras]);

  const handleCopyIP = (ip: string, name: string) => {
    if (!ip) {
      toast.error(`A câmara "${name}" ainda não registou um IP.`);
      return;
    }
    navigator.clipboard.writeText(ip);
    toast.success(`IP da câmara "${name}" copiado: ${ip}`);
  };

  const handleCopyID = (id: string, name: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`ID da câmara "${name}" copiado.`);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteCamera(id);
      toast.success(`Câmara "${name}" eliminada.`);
      void loadCameras();
    } catch {
      toast.error("Erro ao eliminar câmara.");
    }
  };

  const handleToggleFlash = async (camera: Camera) => {
    try {
      const result = await toggleFlash(camera.id);
      const label = result.flash_active ? "ligada" : "desligada";
      toast.success(`Lanterna de "${camera.name}" ${label}.`);
      // Optimistic update
      setCameras((prev) =>
        prev.map((c) =>
          c.id === camera.id ? { ...c, flash_active: result.flash_active } : c,
        ),
      );
    } catch {
      toast.error("Erro ao controlar a lanterna.");
    }
  };

  const columns: ColumnDef<Camera>[] = [
    {
      accessorKey: "name",
      header: "Câmara",
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
      header: "Estado",
      cell: ({ row }) => {
        const status = getCameraStatus(row.original);
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
              {isOnline ? "Online" : "Offline"}
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
      header: "Lanterna",
      cell: ({ row }) => {
        const camera = row.original;
        const active = camera.flash_active;
        return (
          <button
            onClick={() => handleToggleFlash(camera)}
            className="transition-opacity hover:opacity-70 active:opacity-50"
            title="Clica para ligar/desligar"
          >
            {active ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-500 select-none">
                <Lightbulb className="h-3.5 w-3.5 fill-yellow-500" />
                <span>Ligado</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-zinc-500 select-none">
                <LightbulbOff className="h-3.5 w-3.5" />
                <span>Desligado</span>
              </div>
            )}
          </button>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Registo",
      cell: ({ row }) => {
        const dateStr = row.getValue("created_at") as string;
        return (
          <span className="text-muted-foreground">
            {formatDateTime(dateStr)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-2">Ações</div>,
      cell: ({ row }) => {
        const camera = row.original;
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
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-zinc-950 border border-border/80 text-zinc-200"
              >
                <DropdownMenuItem
                  onClick={() => handleCopyID(camera.id, camera.name)}
                  className="cursor-pointer gap-2 font-mono text-xs focus:bg-zinc-900 focus:text-zinc-50"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copiar ID</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCopyIP(camera.ip, camera.name)}
                  className="cursor-pointer gap-2 font-mono text-xs focus:bg-zinc-900 focus:text-zinc-50"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copiar IP{camera.ip ? `: ${camera.ip}` : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem
                  onClick={() => router.push(`/cameras/edit?id=${camera.id}`)}
                  className="cursor-pointer gap-2 text-xs focus:bg-zinc-900"
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(camera.id, camera.name)}
                  className="cursor-pointer gap-2 text-xs focus:bg-zinc-900 text-rose-500 focus:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500/70" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span>Bem-vindo,</span>
            {nameLoading ? (
              <Skeleton className="h-9 w-48 rounded-lg" />
            ) : (
              <AuroraText>{nome || "Utilizador"}</AuroraText>
            )}
          </div>
        }
        description="Gerencia e monitoriza as tuas câmaras."
      />

      {/* Camera Management */}
      <div className="flex flex-col gap-4">
        <DataTable
          columns={columns}
          data={cameras}
          isLoading={camerasLoading}
          filterColumnKey="name"
          filterPlaceholder="Pesquisar câmara..."
          actionButton={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 gap-2 font-medium border-zinc-800 hover:bg-zinc-900 text-zinc-300 cursor-pointer"
                onClick={() => router.push("/cameras/flash")}
                disabled={camerasLoading}
              >
                <Cpu className="h-4 w-4 text-primary" />
                Gravar Firmware (USB)
              </Button>
              <Button
                className="h-9 gap-2 font-medium cursor-pointer"
                onClick={() => router.push("/cameras/new")}
                disabled={camerasLoading}
              >
                <Plus className="h-4 w-4" />
                Adicionar Câmara
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
