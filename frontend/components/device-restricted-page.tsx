"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HyperText } from "@/components/ui/hyper-text";
import { WarpBackground } from "@/components/ui/warp-background";
import { useLanguage } from "@/lib/language-context";

interface DeviceRestrictedPageProps {
  title?: string;
  description?: string;
}

export function DeviceRestrictedPage({
  title,
  description,
}: DeviceRestrictedPageProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const displayTitle = title || t("restricted.title");
  const displayDescription = description || t("restricted.descDefault");

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-3.5rem)] bg-background">
      <WarpBackground className="w-full max-w-lg border border-zinc-800/60 bg-zinc-950/70 p-8 md:p-12 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800/80 mb-6 text-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <MonitorX className="h-8 w-8" />
        </div>

        <HyperText
          className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-4 uppercase"
          duration={800}
        >
          {displayTitle}
        </HyperText>

        <p className="text-sm md:text-base text-zinc-400 max-w-sm mb-8 leading-relaxed">
          {displayDescription}
        </p>

        <Button
          onClick={() => router.push("/")}
          className="h-10 px-6 font-semibold cursor-pointer shadow-md shadow-primary/10 transition-all hover:scale-105 active:scale-95"
        >
          {t("restricted.backButton")}
        </Button>
      </WarpBackground>
    </div>
  );
}
