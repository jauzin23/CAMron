"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CameraFlasher } from "@/components/cameras/camera-flasher";
import { getCamera, type Camera } from "@/lib/api";

function FlashCameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getCamera(id)
        .then(setCamera)
        .catch((err) => console.error("Failed to load camera:", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">A carregar dados da câmara...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow="Configuração"
        title="Gravar Software na Câmara"
        description="Configure a sua câmara e ligue-a à rede Wi-Fi utilizando o cabo USB."
        actions={
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        }
      />

      <div className="flex justify-center py-4">
        <CameraFlasher
          camera={camera || undefined}
          cameraName={camera ? camera.name : "ESP32-CAM"}
          onComplete={() => {
            router.push("/");
          }}
          onCancel={() => {
            router.push("/");
          }}
        />
      </div>
    </div>
  );
}

export default function FlashCameraPage() {
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
