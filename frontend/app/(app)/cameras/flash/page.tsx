"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { CameraFlasher } from "@/components/cameras/camera-flasher";
import { FlashLayout, type MascotState } from "@/components/cameras/flash-layout";
import { getCamera, type Camera } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useDevice } from "@/lib/device-context";
import { DeviceRestrictedPage } from "@/components/device-restricted-page";
import { useLanguage } from "@/lib/language-context";

/** Internal flash steps shown in the left panel progress indicator */
const FLASH_STEPS = [
  { label: "Connect USB" },
  { label: "Wi-Fi Setup" },
  { label: "Compiling" },
  { label: "Flashing" },
  { label: "Verify" },
];

/** Map the internal FlashingStep to a 0-indexed step number for the progress bar */
type FlashingStep = "connect" | "wifi" | "compiling" | "flashing" | "verifying" | "success" | "failed";

function flashingStepToIndex(step: FlashingStep): number {
  const map: Record<FlashingStep, number> = {
    connect: 0,
    wifi: 1,
    compiling: 2,
    flashing: 3,
    verifying: 4,
    success: 4,
    failed: 4,
  };
  return map[step] ?? 0;
}

function FlashCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const id = searchParams.get("id") ?? "";

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Mascot + step tracking
  const [mascotState, setMascotState] = useState<MascotState>("asleep");
  const [currentFlashStep, setCurrentFlashStep] = useState<FlashingStep>("connect");

  const translatedSteps = [
    { label: t("flasher.stepConnect") },
    { label: "Wi-Fi" },
    { label: t("flasher.stepCompile") },
    { label: t("flasher.stepFlash") },
    { label: t("flasher.stepVerify") },
  ];

  useEffect(() => {
    if (!id) {
      router.replace("/");
      return;
    }

    async function loadData() {
      setLoading(true);
      setHasError(false);
      try {
        const cam = await getCamera(id);
        setCamera(cam);
      } catch (err) {
        console.error("Error loading data:", err);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [id, router]);

  if (!id) {
    return null;
  }

  // Loading state — still show the layout with the asleep mascot
  if (loading) {
    return (
      <FlashLayout
        mascotState="asleep"
        steps={translatedSteps}
        currentStep={0}
        headerActions={
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("flash.backToControl")}
          </button>
        }
      >
        <div className="flex h-60 flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">{t("flash.loading")}</span>
        </div>
      </FlashLayout>
    );
  }

  // Error state
  if (hasError || !camera) {
    return (
      <FlashLayout
        mascotState="asleep"
        steps={translatedSteps}
        currentStep={0}
        headerActions={
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("flash.backToControl")}
          </button>
        }
      >
        <div className="flex h-60 flex-col items-center justify-center text-rose-500 gap-3">
          <AlertCircle className="h-6 w-6" />
          <span className="text-sm">{t("flash.loadError")}</span>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="mt-2 text-xs"
          >
            {t("flash.backToControl")}
          </Button>
        </div>
      </FlashLayout>
    );
  }

  return (
    <FlashLayout
      mascotState={
        currentFlashStep === "success" || currentFlashStep === "failed"
          ? undefined
          : mascotState
      }
      cameraName={camera.name}
      steps={translatedSteps}
      currentStep={flashingStepToIndex(currentFlashStep)}
      headerActions={
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none outline-none"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("flash.backToControl")}
        </button>
      }
    >
      <CameraFlasher
        camera={camera}
        cameraName={camera.name}
        onStepChange={(step) => setCurrentFlashStep(step as FlashingStep)}
        onMascotStateChange={setMascotState}
        onComplete={() => {
          router.push("/");
        }}
      />
    </FlashLayout>
  );
}

export default function FlashCameraPage() {
  const { isDesktop } = useDevice();
  const { t } = useLanguage();

  if (!isDesktop) {
    return (
      <DeviceRestrictedPage
        title={t("flash.restrictedTitle")}
        description={t("flash.restrictedDesc")}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">{t("common.loading")}</span>
        </div>
      }
    >
      <FlashCameraContent />
    </Suspense>
  );
}
