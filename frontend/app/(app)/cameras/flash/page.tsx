"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CameraFlasher } from "@/components/cameras/camera-flasher";

export default function FlashCameraPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow="Ferramentas"
        title="Gravar Firmware"
        description="Flashar o firmware do CAMron diretamente no seu dispositivo ESP32 via USB."
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
          cameraName="ESP32-CAM (Standalone)"
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
