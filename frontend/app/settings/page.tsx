'use client';

import * as React from "react"
import { 
  ShieldAlert, 
  Network, 
  Cpu, 
  Wifi, 
  Save, 
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

export default function Page() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-12 min-h-full">
        <div className="view-container space-y-6">
          {/* Title Section */}
          <div className="animate-title-section mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Cluster Configuration</h1>
              <p className="text-sm text-zinc-400">
                Adjust cluster-wide properties, Wi-Fi presets, and storage policies.
              </p>
            </div>
          </div>

          {/* Grid of settings options */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Section 1: General Info */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 animate-grid-item">
              <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
                <Cpu className="size-4 text-zinc-500" />
                Cluster Parameters
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Cluster Identity Name</label>
                  <Input placeholder="CAMron-ESP32-Cluster" defaultValue="CAMron-ESP32-Cluster" className="bg-zinc-950/50 border-zinc-800 h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">NTP Time Server</label>
                  <Input placeholder="pool.ntp.org" defaultValue="pool.ntp.org" className="bg-zinc-950/50 border-zinc-800 h-9" />
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3.5 mt-2">
                  <span className="text-xs text-zinc-400">Local Stream Tunneling</span>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">ENABLED</span>
                </div>
              </div>
            </div>

            {/* Section 2: Wi-Fi Profiles */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 animate-grid-item">
              <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
                <Wifi className="size-4 text-zinc-500" />
                Network Profiles
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Global SSID Backup</label>
                  <Input placeholder="backup-network-5g" className="bg-zinc-950/50 border-zinc-800 h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Static DHCP Range</label>
                  <Input placeholder="192.168.1.80 - 192.168.1.120" defaultValue="192.168.1.80 - 192.168.1.120" className="bg-zinc-950/50 border-zinc-800 h-9" />
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3.5 mt-2">
                  <span className="text-xs text-zinc-400">Force Static IP Binding</span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">DISABLED</span>
                </div>
              </div>
            </div>

            {/* Section 3: Storage Policy */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 animate-grid-item">
              <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
                <Network className="size-4 text-zinc-500" />
                Storage Allocation
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-zinc-400">Storage Buffer Threshold</span>
                    <span className="text-zinc-200">80%</span>
                  </div>
                  <Progress value={80} className="h-1 bg-zinc-950" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Auto-Purge Old Clips</span>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">ON (30 DAYS)</span>
                </div>
              </div>
            </div>

            {/* Section 4: Security Actions */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 animate-grid-item">
              <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
                <ShieldAlert className="size-4 text-zinc-500" />
                System Actions
              </h3>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="h-9 border-zinc-800 text-xs gap-1.5 hover:bg-zinc-800 hover:text-zinc-50 bg-transparent">
                  Reset Cluster
                </Button>
                <Button variant="destructive" className="h-9 text-xs gap-1.5">
                  <Trash2 className="size-3.5" />
                  Purge Storage
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Actions bar */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-5 mt-4">
            <Button variant="outline" className="h-9 border-zinc-800 bg-transparent hover:bg-zinc-800 text-xs">
              Discard Changes
            </Button>
            <Button className="h-9 text-xs gap-1.5 bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
              <Save className="size-4" />
              Save Configurations
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
