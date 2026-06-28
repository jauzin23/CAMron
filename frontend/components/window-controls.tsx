"use client";

import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WindowControls({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5 no-drag", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={() => {}}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={() => {
          if (typeof window !== "undefined" && (window as any).runtime) {
          }
        }}
      >
        <Square className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
        onClick={() => {
          if (typeof window !== "undefined" && (window as any).runtime) {
          }
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
