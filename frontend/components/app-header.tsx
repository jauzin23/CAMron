"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, LayoutDashboard, Video, Globe } from "lucide-react";

import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Language } from "@/lib/language-context";

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

function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ShimmerButton className="shadow-2xl text-xs p-1 px-3">
            {language === "en" ? "EN" : "PT"}
          </ShimmerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-zinc-950 border-zinc-800 text-zinc-200 w-[140px]"
        >
          <DropdownMenuRadioGroup
            value={language}
            onValueChange={(val) => setLanguage(val as Language)}
          >
            <DropdownMenuRadioItem
              value="en"
              className="text-xs cursor-pointer"
            >
              English
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="pt"
              className="text-xs cursor-pointer"
            >
              Português
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [cameraCount, setCameraCount] = useState<number | null>(null);

  useEffect(() => {
    const sseToken = sessionStorage.getItem("camron_jwt") ?? "";
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    if (!sseToken) return;

    const eventSource = new EventSource(
      `${backendUrl}/api/cameras/events?token=${encodeURIComponent(sseToken)}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const dbCams = JSON.parse(event.data);
        if (Array.isArray(dbCams)) {
          setCameraCount(dbCams.length);
        }
      } catch (err) {
        console.error("Failed to parse cameras SSE data in header:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const NAV = [
    {
      href: "/",
      label: t("header.controlCenter"),
      icon: LayoutDashboard,
      disabled: false,
    },
    {
      href: "/live",
      label: t("header.live"),
      icon: Video,
      disabled: cameraCount === 0,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 select-none">
      <div className="mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden text-foreground">
              <LogoSvg viewBox="0 0 1500 1500" className="h-12 w-12 shrink-0" />
            </div>
          </Link>

          <Separator orientation="vertical" className="hidden h-5 sm:block" />

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.disabled ? "#" : item.href}
                  className={cn(
                    "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    item.disabled &&
                      "opacity-50 pointer-events-none cursor-not-allowed",
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
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <LanguageSelector />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-300 hover:bg-zinc-850"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("header.loading")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-zinc-950 border-l border-zinc-800 text-zinc-200 p-6 flex flex-col gap-6"
            >
              <SheetHeader className="p-0 text-left">
                <SheetTitle className="text-zinc-100 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                  <LogoSvg className="h-7 w-7" />
                  <span>CAMron</span>
                </SheetTitle>
                <SheetDescription className="text-zinc-500 text-xs leading-none">
                  {t("header.menuDescription")}
                </SheetDescription>
              </SheetHeader>
              <Separator className="bg-zinc-800/80" />
              <nav className="flex flex-col gap-2">
                {NAV.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.disabled ? "#" : item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border",
                          active
                            ? "bg-zinc-900 text-zinc-100 border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                            : "text-zinc-400 border-transparent hover:bg-zinc-900/40 hover:text-zinc-200 hover:border-zinc-800/40",
                          item.disabled &&
                            "opacity-50 pointer-events-none cursor-not-allowed",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4.5 w-4.5",
                            active ? "text-primary" : "text-zinc-500",
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
