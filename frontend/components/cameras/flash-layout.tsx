"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { PageHeader } from "@/components/page-header";
import { useLanguage } from "@/lib/language-context";

export type MascotState = "asleep" | "working";

export interface FlashStep {
  label: string;
  skipped?: boolean;
}

interface FlashLayoutProps {
  /** Which GIF to display — "asleep" before compile, "working" after */
  mascotState?: MascotState;
  /** Optional camera name shown in the left panel header */
  cameraName?: string;
  /** Step labels and statuses for the left-panel progress indicator */
  steps: FlashStep[];
  /** 0-indexed step currently active */
  currentStep: number;
  /** The right-panel content (step form / progress / etc.) */
  children: React.ReactNode;
  /** Optional header actions (e.g., back button) rendered in top-right area */
  headerActions?: React.ReactNode;
}

export function FlashLayout({
  mascotState,
  cameraName,
  steps,
  currentStep,
  children,
  headerActions,
}: FlashLayoutProps) {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-full flex-col bg-background overflow-hidden">
      <AnimatedGridPattern
        numSquares={35}
        maxOpacity={0.1}
        duration={3}
        repeatDelay={1}
        className="[mask-image:radial-gradient(500px_circle_at_center,white,transparent)] absolute inset-0 h-full w-full fill-white/10 stroke-white/10 pointer-events-none z-0"
      />

      <div className="relative z-10 flex flex-col flex-1 w-full">
        <div className="w-full border-b border-border bg-zinc-950/40 backdrop-blur-sm px-4 md:px-6 py-6">
          <PageHeader
            eyebrow={t("flash.eyebrow")}
            title={
              cameraName
                ? t("flash.title", { name: cameraName })
                : t("flash.title", { name: "ESP32-CAM" })
            }
            description={t("flash.description")}
            actions={headerActions}
            className="border-b-0 pb-0"
          />
        </div>

        <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-6 py-10 gap-8 mt-2">
          <nav
            aria-label="Progress"
            className="flex items-center justify-center gap-0"
          >
            {steps.map((step, i) => {
              const isDone = i < currentStep;
              const isActive = i === currentStep;
              const isLast = i === steps.length - 1;

              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                        isDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : isActive
                            ? "border-primary bg-background text-primary shadow-[0_0_0_4px] shadow-primary/15"
                            : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {isDone ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium tracking-wide text-center max-w-[80px] leading-tight mt-1",
                        isActive
                          ? "text-foreground"
                          : isDone
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {!isLast && (
                    <div
                      className={cn(
                        "mx-2 sm:mx-4 mb-5 h-px flex-1 min-w-[20px] sm:min-w-[45px] transition-colors duration-300",
                        isDone ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          <div className="w-full flex flex-col items-center mt-2">
            {mascotState && (
              <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={mascotState}
                    src={`/${mascotState}.gif`}
                    alt={
                      mascotState === "asleep"
                        ? "Mascot asleep"
                        : "Mascot working"
                    }
                    initial={{ opacity: 0, scale: 0.94, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.04, filter: "blur(4px)" }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.06)]"
                  />
                </AnimatePresence>
              </div>
            )}

            <div className="w-full">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
