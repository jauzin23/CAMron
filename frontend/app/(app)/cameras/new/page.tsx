"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, Cpu } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { CameraWizard } from "@/components/cameras/camera-wizard";
import { WizardStepIdentity } from "@/components/cameras/wizard-step-identity";
import { WizardStepPreview } from "@/components/cameras/wizard-step-preview";
import { WizardStepDone } from "@/components/cameras/wizard-step-done";
import { createCamera, type Camera } from "@/lib/api";
import { CameraFlasher } from "@/components/cameras/camera-flasher";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "Identidade" },
  { label: "Credenciais" },
  { label: "Concluído" },
];

function NewCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step is driven by ?step= URL param (1-indexed) so back button works
  const stepParam = parseInt(searchParams.get("step") ?? "1", 10);
  const currentStep = Math.max(1, Math.min(stepParam, STEPS.length)) - 1; // 0-indexed

  const [createdCamera, setCreatedCamera] = useState<Camera | null>(null);
  const [showFlashWorkflow, setShowFlashWorkflow] = useState<"ask" | "flash" | "none">("none");

  function goToStep(n: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(n));
    router.push(`/cameras/new?${params.toString()}`);
  }

  // Step 1: create camera in DB, then advance
  async function handleIdentity(name: string) {
    const camera = await createCamera({ name });
    setCreatedCamera(camera);
    goToStep(2);
  }

  // Step 2 → 3
  function handlePreviewNext() {
    setShowFlashWorkflow("ask");
  }

  // "Add another" - reset to step 1 with a fresh state
  function handleAddAnother() {
    setCreatedCamera(null);
    setShowFlashWorkflow("none");
    router.push("/cameras/new?step=1");
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow="Câmaras"
        title="Adicionar câmara"
        description="Regista uma nova câmara ESP32 no sistema."
        actions={
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
        }
      />

      <CameraWizard steps={STEPS} currentStep={currentStep}>
        {currentStep === 0 && <WizardStepIdentity onNext={handleIdentity} />}

        {currentStep === 1 && createdCamera && (
          showFlashWorkflow === "none" ? (
            <WizardStepPreview
              camera={createdCamera}
              onNext={handlePreviewNext}
            />
          ) : showFlashWorkflow === "ask" ? (
            <div className="flex flex-col items-center gap-6 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 border border-primary/25">
                <Cpu className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col gap-2 max-w-sm">
                <h3 className="text-lg font-bold text-zinc-100">Gravar firmware no ESP32 agora?</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Para que a câmara funcione, necessita de gravar o firmware no chip ESP32. Pode fazê-lo agora através do browser ou mais tarde no menu principal.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Button 
                  onClick={() => setShowFlashWorkflow("flash")} 
                  className="gap-2 w-full font-semibold cursor-pointer"
                >
                  <Cpu className="h-4 w-4" />
                  Sim, gravar agora
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowFlashWorkflow("none");
                    goToStep(3);
                  }} 
                  className="w-full cursor-pointer text-zinc-400 border-zinc-800 hover:bg-zinc-900"
                >
                  Não, concluir depois
                </Button>
              </div>
            </div>
          ) : (
            <CameraFlasher
              cameraName={createdCamera.name}
              onComplete={() => {
                setShowFlashWorkflow("none");
                goToStep(3);
              }}
              onCancel={() => {
                setShowFlashWorkflow("ask");
              }}
            />
          )
        )}

        {currentStep === 2 && createdCamera && (
          <WizardStepDone
            cameraName={createdCamera.name}
            mode="add"
            onAddAnother={handleAddAnother}
          />
        )}
      </CameraWizard>
    </div>
  );
}

export default function NewCameraPage() {
  return (
    <Suspense>
      <NewCameraContent />
    </Suspense>
  );
}
