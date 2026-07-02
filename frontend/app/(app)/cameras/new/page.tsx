"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { CameraWizard, type Step } from "@/components/cameras/camera-wizard";
import { WizardStepIdentity } from "@/components/cameras/wizard-step-identity";
import { WizardStepDone } from "@/components/cameras/wizard-step-done";
import { createCamera, type Camera } from "@/lib/api";
import { CameraFlasher } from "@/components/cameras/camera-flasher";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

function NewCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step is driven by ?step= URL param (1-indexed) so back button works
  const stepParam = parseInt(searchParams.get("step") ?? "1", 10);
  const currentStep = Math.max(1, Math.min(stepParam, 3)) - 1; // 0-indexed max 3 steps

  const { t, language } = useLanguage();
  const [createdCamera, setCreatedCamera] = useState<Camera | null>(null);
  const [skippedFlash, setSkippedFlash] = useState(false);
  const [flashingStarted, setFlashingStarted] = useState(false);

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
    setFlashingStarted(false);
    router.push("/cameras/new?step=1");
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow={t("edit.eyebrow")}
        title={t("dashboard.buttonAddCamera")}
        description={language === "pt" ? "Regista uma nova câmara ESP32 no sistema." : "Registers a new ESP32 camera in the system."}
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
        {currentStep === 0 && <WizardStepIdentity onNext={handleIdentity} />}

        {currentStep === 1 && createdCamera && (
          <div className="flex flex-col items-center justify-center w-full gap-4 relative">
            <AnimatePresence initial={false}>
              {!flashingStarted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="text-center flex flex-col items-center gap-2 mb-2 overflow-hidden"
                >
                   <h3 className="text-xl font-bold text-zinc-100">{t("flasher.connectCameraPrompt")}</h3>
                   <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                      {t("flasher.connectCameraDesc")}
                   </p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <CameraFlasher
              camera={createdCamera}
              cameraName={createdCamera.name}
              onStepChange={(step) => {
                setFlashingStarted(step !== "connect");
              }}
              onComplete={() => {
                setSkippedFlash(false);
                goToStep(3);
              }}
              onCancel={() => {
                setSkippedFlash(true);
                goToStep(3);
              }}
            />
            
            <div className="mt-4 border-t border-zinc-800/50 pt-4 w-full flex justify-center max-w-lg">
              <Button 
                variant="ghost" 
                className="text-zinc-500 hover:text-zinc-300 w-full sm:w-auto"
                onClick={() => {
                  setSkippedFlash(true);
                  goToStep(3);
                }}
              >
                {t("flasher.configureLater")}
              </Button>
            </div>
          </div>
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

import { useDevice } from "@/lib/device-context";
import { DeviceRestrictedPage } from "@/components/device-restricted-page";

export default function NewCameraPage() {
  const { isDesktop } = useDevice();
  const { t, language } = useLanguage();

  if (!isDesktop) {
    return (
      <DeviceRestrictedPage
        title={language === "pt" ? "Adicionar Câmara Restrita" : "Add Camera Restricted"}
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

