"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, LayoutDashboard } from "lucide-react";

interface WizardStepDoneProps {
  cameraName: string;
  mode: "add" | "edit";
  onAddAnother?: () => void;
}

export function WizardStepDone({
  cameraName,
  mode,
  onAddAnother,
}: WizardStepDoneProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      {/* Icon */}
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-foreground">
          {mode === "add" ? "Câmara adicionada!" : "Câmara atualizada!"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          <span className="font-medium text-foreground">"{cameraName}"</span>{" "}
          {mode === "add"
            ? "foi registada com sucesso."
            : "foi atualizada com sucesso."}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={() => router.push("/")} className="gap-2 w-full">
          <LayoutDashboard className="h-4 w-4" />
          Ir para o Dashboard
        </Button>

        {mode === "add" && onAddAnother && (
          <Button
            variant="outline"
            onClick={onAddAnother}
            className="gap-2 w-full"
          >
            <Plus className="h-4 w-4" />
            Adicionar outra câmara
          </Button>
        )}
      </div>
    </div>
  );
}
