"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, ArrowRight, Info } from "lucide-react";
import type { Camera } from "@/lib/api";

interface WizardStepPreviewProps {
  camera: Camera;
  onNext: () => void;
}

function CopyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  function handleCopy() {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado!`);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2.5">
        <span
          className={
            "flex-1 text-sm text-foreground break-all " +
            (mono ? "font-mono" : "")
          }
        >
          {value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Copiar ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function WizardStepPreview({ camera, onNext }: WizardStepPreviewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Info callout */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/8 px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          A câmara foi criada com sucesso. Guarda estes valores - vais precisar
          deles quando flashares o firmware para o ESP32.
        </p>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <CopyField label="Camera ID" value={camera.id} mono />
        <CopyField label="API Key" value={camera.api_key} mono />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="gap-2">
          Concluir
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
