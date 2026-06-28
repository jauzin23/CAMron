"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Step {
  label: string;
  skipped?: boolean;
}

interface CameraWizardProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  children: React.ReactNode;
}

export function CameraWizard({ steps, currentStep, children }: CameraWizardProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      {/* Step indicator */}
      <nav aria-label="Progress" className="flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          const isLast = i === steps.length - 1;

          return (
            <div key={i} className="flex items-center">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                    step.skipped
                      ? "border-border bg-muted text-muted-foreground"
                      : isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                      ? "border-primary bg-background text-primary shadow-[0_0_0_4px] shadow-primary/15"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isDone && !step.skipped ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium tracking-wide whitespace-nowrap",
                    isActive
                      ? "text-foreground"
                      : isDone
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-3 mb-5 h-px flex-1 min-w-[40px] transition-colors duration-300",
                    isDone && !step.skipped ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Step content */}
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
