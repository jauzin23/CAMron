import { cn } from "@/lib/utils"

export function SignalBars({ level, total = 5 }: { level: number; total?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Signal ${level} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 w-1.5 rounded-[1px]",
            i < level ? "bg-emerald-400" : "bg-zinc-700",
          )}
        />
      ))}
    </span>
  )
}
