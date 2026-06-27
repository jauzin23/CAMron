"use client";

import {
  Activity,
  Archive,
  MoreVertical,
  Settings2,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react";

import type { Camera, CameraStatus } from "@/lib/cameras";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Esp32Board } from "@/components/esp32-board";
import { SignalBars } from "@/components/signal-bars";

const STATUS_META: Record<
  CameraStatus,
  { label: string; dot: string; text: string }
> = {
  live: { label: "Live", dot: "bg-emerald-400", text: "text-emerald-400" },
  recording: { label: "Rec", dot: "bg-red-500", text: "text-red-500" },
  offline: { label: "Offline", dot: "bg-zinc-500", text: "text-zinc-500" },
};

function StatusBadge({ status }: { status: CameraStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 border border-zinc-800 bg-zinc-800/60 font-mono text-[11px] font-medium tracking-tight"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      <span className={meta.text}>{meta.label}</span>
    </Badge>
  );
}

export function CameraCard({ camera }: { camera: Camera }) {
  const offline = camera.status === "offline";

  return (
    <Card className="gap-0 overflow-hidden border-zinc-800 bg-zinc-900 py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3 [.border-b]:pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h3 className="truncate text-sm font-semibold tracking-tight text-zinc-50">
            {camera.name}
          </h3>
          <StatusBadge status={camera.status} />
        </div>
        <span className="shrink-0 font-mono text-xs text-zinc-400">
          {camera.fps}fps
        </span>
      </CardHeader>

      <CardContent className="p-0">
        {/* Visual board container */}
        <div className="relative flex h-44 items-center justify-center border-b border-zinc-800 bg-zinc-950">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
            aria-hidden
          />
          <Esp32Board status={camera.status} />
        </div>

        {/* Telemetry */}
        <div className="space-y-3 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">IP Link</span>
            <span className="font-mono text-xs text-zinc-200">{camera.ip}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Signal</span>
            <span className="flex items-center gap-2">
              <SignalBars level={camera.signal} />
              <span className="font-mono text-xs text-zinc-200">
                {camera.dbm} dBm
              </span>
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-2 border-t border-zinc-800 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 gap-1.5 border-zinc-800 bg-transparent text-xs hover:bg-zinc-800 rounded-full"
        >
          <Archive className="size-3.5" />
          Archive
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "icon",
                className:
                  "size-8 border-zinc-800 bg-transparent hover:bg-zinc-800 rounded-full",
              }),
            )}
          >
            <MoreVertical className="size-4" />
            <span className="sr-only">Camera settings</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 ">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-mono text-xs text-zinc-400">
                {camera.id}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings2 className="size-4" /> Configure
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RefreshCw className="size-4" /> Restart
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Power className="size-4" /> Suspend
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 className="size-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
