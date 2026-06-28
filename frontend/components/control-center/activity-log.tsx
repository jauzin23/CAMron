"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { clienteSessoes, type ClienteSessao } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function OutcomeBadge({ value }: { value: ClienteSessao["estado"] }) {
  if (value === "ativa") {
    return (
      <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
        ativa
      </Badge>
    )
  }
  if (value === "concluida") {
    return (
      <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
        concluída
      </Badge>
    )
  }
  return null
}

export function ActivityLog() {
  const [sessions, setSessions] = useState<ClienteSessao[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 8

  useEffect(() => {
    void loadSessions()
  }, [page])

  async function loadSessions() {
    setLoading(true)
    try {
      const data = await clienteSessoes(limit, (page - 1) * limit)
      
      if (Array.isArray(data)) {
        // Legacy array format
        setSessions(data)
        setTotal(data.length)
      } else {
        // New paginated object format
        setSessions(data?.rows || [])
        setTotal(data?.total || 0)
      }
    } catch (err) {
      console.error("Failed to load sessions:", err)
      setSessions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-end justify-between border-b border-border gap-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-base font-semibold">Histórico de utilização</CardTitle>
          <CardDescription className="font-mono text-xs">
            {loading
              ? "A carregar sessões"
              : total > 0 
                ? `Mostrando ${sessions?.length || 0} de ${total} sessões` 
                : "Sem sessões registadas ainda."}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1 font-mono text-xs border-2" onClick={() => void loadSessions()}>
          atualizar
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Servidor
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Início
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Duração
                </TableHead>
                <TableHead className="pr-6 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!sessions || sessions.length === 0) ? (
                <TableRow className="font-mono text-xs">
                  <TableCell colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    {loading ? "A carregar histórico..." : "Sem sessões registadas ainda."}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                <TableRow key={s.id} className="font-mono text-xs">
                  <TableCell className="pl-6 text-foreground font-semibold">{s.servidor || "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(s.inicio_em)}</TableCell>
                  <TableCell className="text-foreground tabular-nums">{formatDuration(s.duracao_segundos)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <OutcomeBadge value={s.estado} />
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
    </CardContent>
    {total > limit && (
      <div className="border-t border-border p-3 flex items-center justify-between bg-card/50">
        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest pl-3">
          Página {page} de {Math.ceil(total / limit)}
        </div>
        <div className="flex items-center gap-2 pr-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-[10px] font-mono uppercase tracking-wider disabled:opacity-30"
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-[10px] font-mono uppercase tracking-wider disabled:opacity-30"
            disabled={page >= Math.ceil(total / limit) || loading}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    )}
  </Card>
  )
}
