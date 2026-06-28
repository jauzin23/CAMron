"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";

interface WizardStepIdentityProps {
  defaultName?: string;
  onNext: (name: string) => void | Promise<void>;
  submitLabel?: string;
  isEdit?: boolean;
}

export function WizardStepIdentity({
  defaultName = "",
  onNext,
  submitLabel,
  isEdit = false,
}: WizardStepIdentityProps) {
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("O nome da câmara é obrigatório.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onNext(trimmed);
    } catch (err: any) {
      setError(err?.message ?? "Ocorreu um erro. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="camera-name" className="text-sm font-medium">
          Nome da câmara <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="camera-name"
          type="text"
          placeholder='ex: "Entrada Principal", "Garagem"'
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          autoFocus
          autoComplete="off"
          className="h-10"
        />
        {error && (
          <p className="text-xs text-rose-500 mt-0.5">{error}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={loading || !name.trim()}
          className="gap-2 min-w-[130px]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {submitLabel ?? (isEdit ? "Guardar" : "Continuar")}
              {!isEdit && <ArrowRight className="h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
