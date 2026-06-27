'use client';

import * as React from "react"
import { useState } from "react"
import { 
  Play, 
  Download, 
  Calendar, 
  Search, 
  SlidersHorizontal, 
  Database
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MOCK_RECORDINGS = [
  { id: "rec-01", cameraName: "Main Entrance", time: "Today, 18:42", duration: "2h 15m", size: "1.2 GB", event: "Motion Detected" },
  { id: "rec-02", cameraName: "Server Room", time: "Today, 14:10", duration: "45m", size: "480 MB", event: "Door Opened" },
  { id: "rec-03", cameraName: "North Garage", time: "Yesterday, 23:15", duration: "8h 00m", size: "4.8 GB", event: "Scheduled" },
  { id: "rec-04", cameraName: "Backyard", time: "Yesterday, 04:30", duration: "12m", size: "95 MB", event: "Animal Trigger" },
  { id: "rec-05", cameraName: "Outer Gate", time: "2 days ago, 12:00", duration: "1h 30m", size: "850 MB", event: "Vehicle Entry" },
  { id: "rec-06", cameraName: "Side Hallway", time: "3 days ago, 09:15", duration: "30m", size: "290 MB", event: "Motion Detected" }
]

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-12 min-h-full">
        <div className="view-container space-y-6">
          {/* Title Section */}
          <div className="animate-title-section mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Video Archive</h1>
              <p className="text-sm text-zinc-400">
                Access and download stored footage fragments recorded by active nodes.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 border-zinc-800 text-xs">
                <Calendar className="size-3.5 text-zinc-400" />
                Select Date
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 border-zinc-800 text-xs">
                <SlidersHorizontal className="size-3.5 text-zinc-400" />
                Filters
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center bg-zinc-900/50 border border-zinc-800 p-3.5 rounded-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-zinc-500" />
              <Input 
                placeholder="Filter recordings by camera name or trigger..." 
                className="bg-zinc-950/80 border-zinc-800 pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-zinc-950 border border-zinc-800/80 px-3 py-2 rounded-lg shrink-0">
              <Database className="size-3.5 text-zinc-500" />
              <span>STORAGE USED: 8.6 GB / 64 GB</span>
            </div>
          </div>

          {/* Recordings List */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_RECORDINGS.filter(rec => 
              rec.cameraName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rec.event.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((rec) => (
              <div key={rec.id} className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-all hover:bg-zinc-900 hover:border-zinc-700/60 shadow-sm flex flex-col justify-between h-40 animate-grid-item">
                {/* Thumbnail / Event info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-zinc-500 tracking-wider uppercase">{rec.id}</span>
                    <h4 className="text-sm font-semibold text-zinc-100">{rec.cameraName}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                      <span className="text-xs text-zinc-400 font-mono">{rec.time}</span>
                    </div>
                  </div>
                  <span className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                    {rec.event}
                  </span>
                </div>

                {/* Telemetry info */}
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 mt-4 text-xs font-mono text-zinc-400">
                  <div>
                    <span>Duration: </span>
                    <span className="text-zinc-200">{rec.duration}</span>
                  </div>
                  <div>
                    <span>File Size: </span>
                    <span className="text-zinc-200">{rec.size}</span>
                  </div>
                </div>

                {/* Play & Download Overlay */}
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200">
                  <Button variant="secondary" size="sm" className="h-8 gap-1.5 bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
                    <Play className="size-3.5 fill-current" />
                    Play Clip
                  </Button>
                  <Button variant="outline" size="icon" className="size-8 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800">
                    <Download className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
