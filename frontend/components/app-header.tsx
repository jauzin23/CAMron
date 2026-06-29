"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { href: "/", label: "Centro de Controlo" },
  { href: "/live", label: "Live" },
];

export function LogoSvg({
  className,
}: {
  viewBox?: string;
  className: string;
}) {
  return (
    <img
      src="/logo.png"
      alt="CAMron"
      className={cn("object-contain", className)}
    />
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [timeString, setTimeString] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setTimeString(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
          now.getHours(),
        )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 select-none"
      style={{ "--wails-draggable": "drag" } as any}
    >
      <div className="mx-auto flex h-14 items-center gap-6 px-6 pr-3">
        <Link href="/" className="flex items-center gap-2 no-drag">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden text-foreground">
            <LogoSvg viewBox="0 0 1500 1500" className="h-12 w-12 shrink-0" />
          </div>
        </Link>

        <Separator orientation="vertical" className="hidden h-5 sm:block" />

        <nav className="hidden items-center gap-1 sm:flex no-drag">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-3 -bottom-3.25 h-px bg-foreground"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {timeString ? (
            <div className="font-mono text-xs text-muted-foreground bg-secondary/40 border border-border/50 px-2.5 py-1 rounded select-none">
              {timeString}
            </div>
          ) : (
            <Skeleton className="h-6 w-32" />
          )}
        </div>
      </div>
    </header>
  );
}
