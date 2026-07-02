"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CameraFlasher } from "@/components/cameras/camera-flasher";
import { getCamera, type Camera } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useDevice } from "@/lib/device-context";
import { DeviceRestrictedPage } from "@/components/device-restricted-page";
import { useLanguage } from "@/lib/language-context";

function FlashCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const id = searchParams.get("id") ?? "";

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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

  if (loading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">{t("flash.loading")}</span>
      </div>
    );
  }

  if (hasError || !camera) {
    return (
      <div className="flex h-60 flex-col items-center justify-center text-rose-500 gap-3">
        <AlertCircle className="h-6 w-6" />
        <span className="text-sm">
          {t("flash.loadError")}
        </span>
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="mt-2 text-xs"
        >
          {t("flash.backToControl")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow={t("flash.eyebrow")}
        title={t("flash.title", { name: camera.name })}
        description={t("flash.description")}
        actions={
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("flash.backToControl")}
          </button>
        }
      />

      <div className="flex justify-center py-4">
        <CameraFlasher
          camera={camera}
          cameraName={camera.name}
          onComplete={() => {
            router.push("/");
          }}
        />
      </div>
    </div>
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
