import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const dotVariants = cva(
  "relative inline-flex rounded-full transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary",
        success: "bg-emerald-500 text-emerald-500",
        warning: "bg-amber-500 text-amber-500",
        error: "bg-rose-500 text-rose-500",
        info: "bg-sky-500 text-sky-500",
        muted: "bg-muted-foreground/50 text-muted-foreground/50",
      },
      size: {
        sm: "h-2 w-2",
        md: "h-3 w-3",
        lg: "h-4 w-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof dotVariants> {
  pulse?: boolean
}

function StatusDot({
  className,
  variant,
  size,
  pulse = false,
  ...props
}: StatusDotProps) {
  const sizeClass = size === "sm" ? "h-2 w-2" : size === "lg" ? "h-4 w-4" : "h-3 w-3";

  return (
    <span
      className={cn("relative flex items-center justify-center shrink-0", sizeClass, className)}
      {...props}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            dotVariants({ variant, size: "sm" })
          )}
        />
      )}
      <span className={cn(dotVariants({ variant, size }))} />
    </span>
  )
}

export { StatusDot, dotVariants }
