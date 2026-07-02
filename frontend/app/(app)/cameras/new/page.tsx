"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Zap, ArrowRight, SkipForward } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { CameraWizard, type Step } from "@/components/cameras/camera-wizard";
import { WizardStepIdentity } from "@/components/cameras/wizard-step-identity";
import { WizardStepDone } from "@/components/cameras/wizard-step-done";
import { createCamera, type Camera } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useDevice } from "@/lib/device-context";
import { DeviceRestrictedPage } from "@/components/device-restricted-page";

function NewCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step is driven by ?step= URL param (1-indexed) so back button works
  const stepParam = parseInt(searchParams.get("step") ?? "1", 10);
  const currentStep = Math.max(1, Math.min(stepParam, 3)) - 1; // 0-indexed max 3 steps

  const { t, language } = useLanguage();
  const [createdCamera, setCreatedCamera] = useState<Camera | null>(null);
  const [skippedFlash, setSkippedFlash] = useState(false);

  const steps: Step[] = [
    { label: t("wizard.identity") },
    { label: t("wizard.flash"), skipped: skippedFlash },
    { label: t("wizard.done") },
  ];

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

  // "Add another" - reset to step 1 with a fresh state
  function handleAddAnother() {
    setCreatedCamera(null);
    setSkippedFlash(false);
    router.push("/cameras/new?step=1");
  }

  // Redirect to the dedicated flash page — camera is already in DB from step 1
  function handleFlashNow() {
    if (!createdCamera) return;
    router.push(`/cameras/flash?id=${createdCamera.id}`);
  }

  // Skip flashing — go straight to done
  function handleSkipFlash() {
    setSkippedFlash(true);
    goToStep(3);
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow={t("edit.eyebrow")}
        title={t("dashboard.buttonAddCamera")}
        description={
          language === "pt"
            ? "Regista uma nova câmara ESP32 no sistema."
            : "Registers a new ESP32 camera in the system."
        }
        actions={
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
        }
      />

      <CameraWizard steps={steps} currentStep={currentStep}>
        {/* ── Step 1: Identity ── */}
        {currentStep === 0 && <WizardStepIdentity onNext={handleIdentity} />}

        {/* ── Step 2: Firmware decision prompt ── */}
        {currentStep === 1 && createdCamera && (
          <AnimatePresence mode="wait">
            <motion.div
              key="flash-decision"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center gap-8 py-4 text-center"
            >
              {/* Prompt text */}
              <div className="flex flex-col gap-2 max-w-sm">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  {language === "pt"
                    ? "Gravar firmware agora?"
                    : "Flash firmware now?"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {language === "pt"
                    ? `A câmara "${createdCamera.name}" foi criada com sucesso. Queres gravar o firmware ESP32 agora?`
                    : `The camera "${createdCamera.name}" was created. Do you want to flash the ESP32 firmware now?`}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button
                  onClick={handleFlashNow}
                  size="lg"
                  className="w-full gap-2.5 font-semibold h-11 shadow-md"
                >
                  <Zap className="h-4 w-4" />
                  {language === "pt" ? "Gravar Firmware" : "Flash Firmware"}
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSkipFlash}
                  size="lg"
                  className="w-full gap-2 font-medium h-11 text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="h-4 w-4" />
                  {language === "pt"
                    ? "Configurar mais tarde"
                    : "Configure later"}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Step 3: Done ── */}
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
  const { isDesktop } = useDevice();
  const { t, language } = useLanguage();

  if (!isDesktop) {
    return (
      <DeviceRestrictedPage
        title={
          language === "pt"
            ? "Adicionar Câmara Restrita"
            : "Add Camera Restricted"
        }
        description={t("restricted.descNew")}
      />
    );
  }

  return (
    <Suspense>
      <NewCameraContent />
    </Suspense>
  );
}
