"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { getModels, type ServerInfo } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Play,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ServerWithStatus = ServerInfo & {
  status: "ready" | "outdated" | "not_installed";
  progress?: number;
  isDownloading?: boolean;
  isSelected?: boolean;
};

export default function ServersPage() {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const data = await getModels();
      const serversWithStatus = await Promise.all(
        data.map(async (s) => {
          return {
            ...s,
            status: status as any,
          };
        }),
      );
      setServers(serversWithStatus);
    } catch (err) {
      toast.error("Erro ao carregar servidores");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (server: ServerWithStatus) => {
    if (!server.latest_bot) return;
    try {
      setServers((prev) =>
        prev.map((s) =>
          s.id === server.id ? { ...s, isDownloading: true, progress: 0 } : s,
        ),
      );
      toast.success(`Servidor ${server.name} descarregado com sucesso`);
      await fetchData();
    } catch (err: any) {
      toast.error(`Erro ao descarregar: ${err}`);
      setServers((prev) =>
        prev.map((s) =>
          s.id === server.id ? { ...s, isDownloading: false } : s,
        ),
      );
    }
  };

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Servidores"
        description="Gere os servidores e os bots instalados no seu computador."
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Pesquisar servidores..."
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Atualizar Lista
          </Button>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Servidor</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />A carregar
                      servidores...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredServers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum servidor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredServers.map((server) => (
                  <TableRow
                    key={server.id}
                    className={cn(server.isSelected && "bg-primary/5")}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border/50 shadow-sm">
                          {server.logo_url ? (
                            <img
                              src={server.logo_url}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                                (
                                  e.target as HTMLImageElement
                                ).parentElement!.classList.add(
                                  "bg-secondary",
                                  "flex",
                                  "items-center",
                                  "justify-center",
                                );
                                (
                                  e.target as HTMLImageElement
                                ).parentElement!.innerHTML =
                                  `<span class="text-xs font-bold">${server.name.substring(0, 2).toUpperCase()}</span>`;
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-secondary">
                              <span className="text-xs font-bold">
                                {server.name.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold">{server.name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {server.latest_bot?.version ?? "N/A"}
                    </TableCell>
                    <TableCell>
                      {server.isDownloading ? (
                        <div className="flex w-[160px] flex-col gap-1.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-mono leading-none">
                            <span>A descarregar...</span>
                            <span>{server.progress}%</span>
                          </div>
                          <Progress value={server.progress} className="h-1.5" />
                        </div>
                      ) : (
                        <Badge
                          variant={
                            server.status === "ready"
                              ? "default"
                              : server.status === "outdated"
                                ? "destructive"
                                : "secondary"
                          }
                          className={cn(
                            "font-mono text-[10px] uppercase tracking-wider",
                            server.status === "ready" &&
                              "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent",
                          )}
                        >
                          {server.status === "ready"
                            ? "Sincronizado"
                            : server.status === "outdated"
                              ? "Desatualizado"
                              : "Não Instalado"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {server.status === "not_installed" &&
                          !server.isDownloading && (
                            <Button
                              size="sm"
                              className="gap-2 h-8"
                              onClick={() => handleDownload(server)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Transferir
                            </Button>
                          )}
                        {server.status === "outdated" &&
                          !server.isDownloading && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-2 h-8"
                              onClick={() => handleDownload(server)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Atualizar
                            </Button>
                          )}
                        {server.status === "ready" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {server.isDownloading && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled
                            className="h-8 px-3 italic text-xs"
                          >
                            Aguarde...
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
