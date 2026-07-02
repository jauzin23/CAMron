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

function FlashCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        console.error("Erro a carregar dados:", err);
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
        <span className="text-sm">A carregar dados...</span>
      </div>
    );
  }

  if (hasError || !camera) {
    return (
      <div className="flex h-60 flex-col items-center justify-center text-rose-500 gap-3">
        <AlertCircle className="h-6 w-6" />
        <span className="text-sm">Erro ao carregar os dados. O backend está a correr?</span>
        <Button variant="outline" onClick={() => router.push("/")} className="mt-2 text-xs">
          Voltar ao Centro de Controlo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow="Configuração"
        title={`Gravar Firmware em "${camera.name}"`}
        description="Configure a sua câmara e ligue-a à rede Wi-Fi utilizando o cabo USB."
        actions={
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Centro de Controlo
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

  if (!isDesktop) {
    return (
      <DeviceRestrictedPage
        title="Gravação de Firmware Restrita"
        description="A gravação de firmware requer ligação física via USB utilizando a norma WebUSB, funcionalidade apenas disponível em browsers de computadores (Desktop)."
      />
    );
  }

  return (
    <Suspense fallback={
      <div className="flex h-40 items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">A carregar...</span>
      </div>
    }>
      <FlashCameraContent />
    </Suspense>
  );
}

