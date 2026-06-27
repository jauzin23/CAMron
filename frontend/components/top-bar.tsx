"use client";

import * as React from "react";
import { AddDeviceSheet } from "@/components/add-device-sheet";
import { SlidingCapsuleNav } from "@/components/ui/sliding-capsule-nav";
import { Video, Cpu, Settings, Archive } from "lucide-react";
import { usePathname } from "next/navigation";

const TABS = [
  { title: "Cameras", url: "/", icon: <Video className="size-3.5" /> },
  {
    title: "Archive",
    url: "/archive",
    icon: <Archive className="size-3.5" />,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: <Settings className="size-3.5" />,
  },
];

export function TopBar() {
  const pathname = usePathname();

  if (pathname.startsWith("/view")) {
    return null;
  }

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 rounded-full border border-zinc-800 bg-zinc-950/85 px-4 py-2 shadow-2xl backdrop-blur-md w-[92%] max-w-5xl">
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="CAMron Logo"
          className="h-10 w-10 object-contain select-none pointer-events-none"
        />
      </div>

      <div className="flex-1 max-w-xs md:max-w-md flex justify-center">
        <SlidingCapsuleNav
          tabs={TABS}
          className="border-none bg-transparent p-0"
        />
      </div>

      <div className="flex items-center">
        <AddDeviceSheet />
      </div>
    </header>
  );
}
