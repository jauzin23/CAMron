"use client";

import { useState } from "react";
import {
  Plus,
  Usb,
  ArrowRight,
  ArrowLeft,
  Zap,
  Cpu,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs">
      {([1, 2] as const).map((n, i) => (
        <div key={n} className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
              step === n
                ? "border-zinc-50 bg-zinc-50 text-zinc-900"
                : step > n
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 bg-transparent text-zinc-500",
            )}
          >
            {step > n ? <CheckCircle2 className="size-3.5" /> : n}
          </span>
          <span className={cn(step === n ? "text-zinc-200" : "text-zinc-50")}>
            {n === 1 ? "Metadata" : "Flash"}
          </span>
          {i === 0 && <span className="h-px w-6 bg-zinc-800" />}
        </div>
      ))}
    </div>
  );
}

const LOG_LINES = [
  "-> esptool.py v4.7  // chip: ESP32-D0WD-V3",
  "-> Serial port detected: /dev/ttyUSB0 @ 921600",
  "-> Compiling target... Done.",
  "-> Erasing flash (0x00000)... Done.",
  "-> Writing blocks to boot partition (45%)...",
];

export function AddDeviceSheet() {
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [name, setName] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");

  // Advanced settings states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resolution, setResolution] = useState("VGA");
  const [fps, setFps] = useState("15");
  const [jpegQuality, setJpegQuality] = useState("12");
  const [rotation, setRotation] = useState("0");
  const [hmirror, setHmirror] = useState(false);
  const [vflip, setVflip] = useState(false);

  const resetForm = () => {
    setStep(1);
    setName("");
    setWifiSsid("");
    setWifiPass("");
    setResolution("VGA");
    setFps("15");
    setJpegQuality("12");
    setRotation("0");
    setHmirror(false);
    setVflip(false);
    setShowAdvanced(false);
  };

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) resetForm();
      }}
    >
      <SheetTrigger
        className={cn(buttonVariants({ size: "lg", className: "h-9 gap-1.5 rounded-full" }))}
      >
        <Plus className="size-4" />
        Pair Device
      </SheetTrigger>
      <SheetContent className="w-full gap-0 border-zinc-800 bg-zinc-950 p-0 sm:max-w-md">
        <SheetHeader className="gap-3 border-b border-zinc-800 px-6 py-5">
          <SheetTitle className="text-base tracking-tight text-zinc-50">
            Pair New Device
          </SheetTitle>
          <SheetDescription className="text-zinc-400">
            Configure metadata and flash the firmware via Web Serial.
          </SheetDescription>
          <StepIndicator step={step} />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 ? (
            <div className="space-y-6">
              <section className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                  Camera Identification
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="cam-name">Device name</Label>
                  <Input
                    id="cam-name"
                    placeholder="e.g., Main Entrance"
                    className="bg-zinc-900"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </section>

              <Separator className="bg-zinc-800" />

              <section className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                  Network Configuration
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="wifi-ssid">Wi-Fi SSID</Label>
                  <Input
                    id="wifi-ssid"
                    placeholder="local-network-5g"
                    className="bg-zinc-900"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wifi-pass">Password</Label>
                  <Input
                    id="wifi-pass"
                    type="password"
                    placeholder="••••••••••"
                    className="bg-zinc-900"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </div>
              </section>

              <Separator className="bg-zinc-800" />

              <section className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex w-full items-center justify-between text-left font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer"
                >
                  <span>Advanced Parameters</span>
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform duration-200",
                      showAdvanced && "rotate-180"
                    )}
                  />
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Resolution */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cam-res">Resolution</Label>
                        <select
                          id="cam-res"
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer"
                        >
                          <option value="QQVGA">QQVGA (160×120)</option>
                          <option value="QVGA">QVGA (320×240)</option>
                          <option value="CIF">CIF (400×296)</option>
                          <option value="VGA">VGA (640×480) [Default]</option>
                          <option value="SVGA">SVGA (800×600)</option>
                          <option value="XGA">XGA (1024×768)</option>
                          <option value="SXGA">SXGA (1280×1024)</option>
                          <option value="UXGA">UXGA (1600×1200)</option>
                        </select>
                      </div>

                      {/* FPS */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cam-fps">Target FPS</Label>
                        <select
                          id="cam-fps"
                          value={fps}
                          onChange={(e) => setFps(e.target.value)}
                          className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer"
                        >
                          <option value="5">5 FPS</option>
                          <option value="10">10 FPS</option>
                          <option value="15">15 FPS [Default]</option>
                          <option value="20">20 FPS</option>
                          <option value="25">25 FPS</option>
                          <option value="30">30 FPS</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* JPEG Quality */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cam-quality">JPEG Quality</Label>
                        <select
                          id="cam-quality"
                          value={jpegQuality}
                          onChange={(e) => setJpegQuality(e.target.value)}
                          className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer"
                        >
                          <option value="8">Best (8)</option>
                          <option value="12">Standard (12) [Default]</option>
                          <option value="20">Medium (20)</option>
                          <option value="30">Low (30)</option>
                          <option value="45">Very Low (45)</option>
                        </select>
                      </div>

                      {/* Rotation */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cam-rotation">Rotation</Label>
                        <select
                          id="cam-rotation"
                          value={rotation}
                          onChange={(e) => setRotation(e.target.value)}
                          className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer"
                        >
                          <option value="0">0° [Default]</option>
                          <option value="90">90°</option>
                          <option value="180">180°</option>
                          <option value="270">270°</option>
                        </select>
                      </div>
                    </div>

                    {/* Mirror & Flip toggles */}
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-400 select-none hover:text-zinc-200 transition-colors">
                        <input
                          type="checkbox"
                          checked={hmirror}
                          onChange={(e) => setHmirror(e.target.checked)}
                          className="accent-zinc-100 rounded border-zinc-800 bg-zinc-900 size-4 cursor-pointer"
                        />
                        <span>Horizontal Mirror</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-400 select-none hover:text-zinc-200 transition-colors">
                        <input
                          type="checkbox"
                          checked={vflip}
                          onChange={(e) => setVflip(e.target.checked)}
                          className="accent-zinc-100 rounded border-zinc-800 bg-zinc-900 size-4 cursor-pointer"
                        />
                        <span>Vertical Flip</span>
                      </label>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <h4 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                  Web Serial Flash Pipeline
                </h4>

                {/* Terminal-like card */}
                <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                  {/* USB -> chip mapping */}
                  <div className="flex items-center justify-center gap-3 border-b border-zinc-800 bg-zinc-900/40 px-4 py-5 font-mono text-zinc-500">
                    <div className="flex flex-col items-center gap-1">
                      <Usb className="size-5 text-zinc-300" />
                      <span className="text-[10px]">USB</span>
                    </div>
                    <span className="text-zinc-600">{"==[ttyUSB0]=>"}</span>
                    <div className="flex flex-col items-center gap-1">
                      <Cpu className="size-5 text-zinc-300" />
                      <span className="text-[10px]">ESP32</span>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <Button className="w-full gap-1.5">
                      <Zap className="size-4" />
                      Detect &amp; Flash Firmware via Browser
                    </Button>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-zinc-400">flashing...</span>
                        <span className="text-zinc-300">45%</span>
                      </div>
                      <Progress value={45} className="h-1 bg-zinc-800" />
                    </div>

                    {/* console log */}
                    <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-black px-3 py-3 font-mono text-[11px] leading-relaxed text-zinc-400">
                      {LOG_LINES.map((line) => (
                        <div
                          key={line}
                          className={
                            line.includes("45%")
                              ? "text-emerald-400"
                              : undefined
                          }
                        >
                          {line}
                        </div>
                      ))}
                      <div className="text-zinc-600">
                        <span className="text-emerald-400">$</span>{" "}
                        <span className="animate-pulse">▋</span>
                      </div>
                    </pre>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-zinc-800 px-6 py-4">
          {step === 1 ? (
            <>
              <span className="font-mono text-xs text-zinc-500">
                Step 1 / 2
              </span>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setStep(2)}
                disabled={!name.trim() || !wifiSsid.trim() || !wifiPass.trim()}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-zinc-800 bg-transparent hover:bg-zinc-800"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-zinc-800 hover:bg-zinc-700"
              >
                Complete Pairing
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
