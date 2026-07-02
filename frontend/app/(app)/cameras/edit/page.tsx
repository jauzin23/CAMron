"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { CameraWizard } from "@/components/cameras/camera-wizard";
import { WizardStepIdentity } from "@/components/cameras/wizard-step-identity";
import { WizardStepDone } from "@/components/cameras/wizard-step-done";
import { getCamera, updateCamera, type Camera } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";

function EditCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const STEPS = [
    { label: t("wizard.identity") },
    { label: t("wizard.done") },
  ];

  const id = searchParams.get("id") ?? "";
  const stepParam = parseInt(searchParams.get("step") ?? "1", 10);
  const currentStep = Math.max(1, Math.min(stepParam, STEPS.length)) - 1; // 0-indexed

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoadError(t("edit.loadError"));
      setLoadingCamera(false);
      return;
    }
    setLoadingCamera(true);
    getCamera(id)
      .then(setCamera)
      .catch(() => setLoadError(t("edit.notFound")))
      .finally(() => setLoadingCamera(false));
  }, [id, t]);

  function goToStep(n: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("step", String(n));
    router.push(`/cameras/edit?${p.toString()}`);
  }

  async function handleIdentity(name: string) {
    if (!id) return;
    const updated = await updateCamera(id, { name });
    setCamera(updated);
    goToStep(2);
  }

  if (loadingCamera) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t("edit.loadingCamera")}</span>
      </div>
    );
  }

  if (loadError || !camera) {
    return (
      <div className="flex h-40 items-center justify-center text-rose-500 gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{loadError ?? t("edit.unknownError")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow={t("edit.eyebrow")}
        title={t("edit.title", { name: camera.name })}
        description={t("edit.description")}
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

      <CameraWizard steps={STEPS} currentStep={currentStep}>
        {currentStep === 0 && (
          <WizardStepIdentity
            defaultName={camera.name}
            onNext={handleIdentity}
            isEdit
          />
        )}
        {currentStep === 1 && (
          <WizardStepDone cameraName={camera.name} mode="edit" />
        )}
      </CameraWizard>
    </div>
  );
}

export default function EditCameraPage() {
  return (
    <Suspense>
      <EditCameraContent />
    </Suspense>
  );
}
