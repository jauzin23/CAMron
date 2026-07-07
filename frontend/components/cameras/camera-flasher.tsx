"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Usb,
  Wifi,
  Cpu,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Eye,
  EyeOff,
} from "lucide-react";
import { type Camera, authFetch } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import type { MascotState } from "@/components/cameras/flash-layout";

interface CameraFlasherProps {
  camera?: Camera;
  cameraName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onStepChange?: (step: FlashingStep) => void;
  onMascotStateChange?: (state: MascotState) => void;
}

type FlashingStep =
  | "connect"
  | "wifi"
  | "compiling"
  | "flashing"
  | "verifying"
  | "success"
  | "failed";

const stepVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    transition: { duration: 0.15, ease: "easeIn" },
  },
} as const;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export function CameraFlasher({
  camera,
  cameraName = "ESP32-CAM",
  onComplete,
  onCancel,
  onStepChange,
  onMascotStateChange,
}: CameraFlasherProps) {
  const { t } = useLanguage();
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [step, setStepState] = useState<FlashingStep>("connect");

  function getMascotState(s: FlashingStep): MascotState {
    return s === "connect" || s === "wifi" ? "asleep" : "working";
  }

  const setStep = (newStep: FlashingStep) => {
    setStepState(newStep);
    onStepChange?.(newStep);
    onMascotStateChange?.(getMascotState(newStep));
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [serialSupported, setSerialSupported] = useState<boolean>(false);
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(5);

  const [port, setPort] = useState<any>(null);
  const transportRef = useRef<any>(null);
  const isFirstLoadRef = useRef<boolean>(true);

  const [wifiSsid, setWifiSsid] = useState<string>("MinhaRede_2.4G");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [backendIp, setBackendIp] = useState<string>("127.0.0.1");
  const [backendPort, setBackendPort] = useState<string>("3000");

  const [cameraId, setCameraId] = useState<string | null>(null);
  const [newCameraName, setNewCameraName] = useState<string>("");
  const [isReflash, setIsReflash] = useState<boolean>(false);
  const [detectedCameraName, setDetectedCameraName] = useState<string>("");

  const [allCameras, setAllCameras] = useState<Camera[]>([]);
  const [camerasLoading, setCamerasLoading] = useState<boolean>(true);
  const [flashProgress, setFlashProgress] = useState<number>(0);
  const [currentFlashingFile, setCurrentFlashingFile] =
    useState<string>("firmware.bin");

  const [verificationStatus, setVerificationStatus] = useState<
    "waiting" | "timeout"
  >("waiting");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (camera) {
      setCameraId(camera.id);
      setWifiSsid(camera.wifi_ssid || "");
      setWifiPassword(camera.wifi_pass || "");
      setIsReflash(true);
      setDetectedCameraName(camera.name);
    }
  }, [camera]);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const secure = window.isSecureContext ?? true;
      setIsSecure(secure);
      if ("serial" in navigator) {
        setSerialSupported(true);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (step === "connect") {
      if (!isFirstLoadRef.current) {
        setCountdown(0);
        return;
      }
      isFirstLoadRef.current = false;
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  useEffect(() => {
    if (isMounted) {
      const fetchNetworkInfo = async () => {
        try {
          const res = await authFetch(`${BACKEND_URL}/api/network-info`);
          if (res.ok) {
            const data = await res.json();
            setBackendIp(data.ip);
            setBackendPort(data.port.toString());
          }
        } catch (err) {}
      };
      void fetchNetworkInfo();

      const fetchCameras = async () => {
        setCamerasLoading(true);
        try {
          const res = await authFetch(`${BACKEND_URL}/api/cameras`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              const configured = data.filter((c) => c.wifi_ssid);
              setAllCameras(configured);
            }
          }
        } catch (err) {
        } finally {
          setCamerasLoading(false);
        }
      };
      void fetchCameras();
    }
  }, [isMounted]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const handleConnectPort = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { ESPLoader, Transport } = await import("esptool-js");

      const activePort = await (navigator as any).serial.requestPort();
      if (!activePort) {
        throw new Error(t("flasher.noUsbSelected"));
      }

      setPort(activePort);

      let detectedId = "";
      try {
        await activePort.open({ baudRate: 115200 });
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const writer = activePort.writable.getWriter();
        const reader = activePort.readable.getReader();

        try {
          const handshakeStart = Date.now();
          let rxBuffer = "";

          while (Date.now() - handshakeStart < 1200) {
            await writer.write(encoder.encode("CAMRON_HANDSHAKE\n"));

            const result = await Promise.race([
              reader.read(),
              new Promise<any>((resolve) =>
                setTimeout(() => resolve({ done: false, value: null }), 180),
              ),
            ]);

            if (result.value) {
              rxBuffer += decoder.decode(result.value);
              const idIndex = rxBuffer.indexOf("CAMRON_ID:");
              if (idIndex !== -1) {
                const idPart = rxBuffer.substring(idIndex + 10).trim();
                if (idPart.length >= 36) {
                  detectedId = idPart.substring(0, 36);
                  break;
                }
              }
            }
          }
        } finally {
          writer.releaseLock();
          reader.releaseLock();
        }
        try {
          await activePort.setSignals({
            dataTerminalReady: false,
            requestToSend: false,
          });
        } catch (e) {}
        await activePort.close();
      } catch (handshakeErr) {
        console.warn(
          "Serial handshake error, proceeding normally:",
          handshakeErr,
        );
        try {
          await activePort.setSignals({
            dataTerminalReady: false,
            requestToSend: false,
          });
        } catch (e) {}
        try {
          await activePort.close();
        } catch (closeErr) {}
      }

      if (detectedId) {
        console.log("Handshake successful! Detected ID:", detectedId);
        try {
          const res = await authFetch(
            `${BACKEND_URL}/api/cameras/${detectedId}`,
          );
          if (res.ok) {
            const existingCamera = await res.json();
            if (existingCamera && existingCamera.id) {
              setCameraId(existingCamera.id);
              setWifiSsid(existingCamera.wifi_ssid || "");
              setWifiPassword(existingCamera.wifi_pass || "");
              setIsReflash(true);
              setDetectedCameraName(existingCamera.name);
              toast.success(t("flasher.connectSuccess"));
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching data for detected camera:", fetchErr);
        }
        setStep("wifi");
      } else {
        const transport = new Transport(activePort, false);
        transportRef.current = transport;

        const silentTerminal = {
          clean: () => {},
          writeLine: (data: string) => {
            if (
              data.toLowerCase().includes("error") ||
              data.toLowerCase().includes("fail")
            ) {
              console.error(data);
            }
          },
          write: (data: string) => {
            if (
              data.toLowerCase().includes("error") ||
              data.toLowerCase().includes("fail")
            ) {
              console.error(data);
            }
          },
        };

        const loader = new ESPLoader({
          transport: transport,
          baudrate: 115200,
          terminal: silentTerminal,
        });

        await loader.main();
        await transport.setRTS(false);
        await transport.setDTR(false);
        await transport.disconnect();
        setStep("wifi");
      }
    } catch (err: any) {
      if (transportRef.current) {
        try {
          await transportRef.current.setRTS(false);
          await transportRef.current.setDTR(false);
          await transportRef.current.disconnect();
        } catch (discErr) {}
      }

      if (err.message && err.message.includes("Failed to open serial port")) {
        setErrorMsg(t("flasher.portInUse"));
      } else if (
        err.name === "NotFoundError" ||
        err.message.includes("User cancelled")
      ) {
        setErrorMsg(t("flasher.usbCancelled"));
      } else {
        setErrorMsg(t("flasher.cameraNotFound"));
      }
      setStep("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCompilation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid || !wifiPassword) {
      toast.error(t("flasher.missingWifi"));
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setStep("compiling");

    try {
      const response = await authFetch(`${BACKEND_URL}/api/compile/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wifi_ssid: wifiSsid,
          wifi_password: wifiPassword,
          custom_host: backendIp,
          custom_port: parseInt(backendPort, 10),
          cameraId: cameraId,
          name: isReflash ? detectedCameraName : newCameraName || cameraName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("flasher.compileInitFailed"));
      }

      const { cameraId: generatedId } = await response.json();
      setCameraId(generatedId);

      const sseToken = sessionStorage.getItem("camron_jwt") ?? "";
      const eventSource = new EventSource(
        `${BACKEND_URL}/api/compile/stream/${generatedId}?token=${encodeURIComponent(sseToken)}`,
      );

      eventSource.addEventListener("complete", (event: any) => {
        eventSource.close();
        void handleFlashDevice(generatedId);
      });

      eventSource.addEventListener("error", () => {
        eventSource.close();
        setErrorMsg(t("flasher.compilePrepareError"));
        setStep("failed");
        void authFetch(`${BACKEND_URL}/api/cleanup/${generatedId}`, {
          method: "POST",
        }).catch(() => {});
      });
    } catch (err: any) {
      setStep("failed");
      setErrorMsg(t("flasher.compileInternalError"));
    } finally {
      setLoading(false);
    }
  };

  const handleFlashDevice = async (targetCameraId: string) => {
    setStep("flashing");
    setFlashProgress(0);
    setCurrentFlashingFile(t("flasher.downloadingBinaries"));
    setErrorMsg("");

    try {
      const { ESPLoader, Transport } = await import("esptool-js");

      const filesToFlash = [
        { name: "bootloader.bin", address: 0x1000 },
        { name: "partitions.bin", address: 0x8000 },
        { name: "boot_app0.bin", address: 0xe000 },
        { name: "firmware.bin", address: 0x10000 },
      ];

      const fileArray = await Promise.all(
        filesToFlash.map(async (fileInfo) => {
          const downloadUrl = `${BACKEND_URL}/api/download/${targetCameraId}/${fileInfo.name}`;
          const res = await authFetch(downloadUrl);
          if (!res.ok) {
            throw new Error(
              `${t("flasher.fileDownloadError")} ${fileInfo.name}.`,
            );
          }
          const buf = await res.arrayBuffer();
          return {
            data: new Uint8Array(buf),
            address: fileInfo.address,
          };
        }),
      );

      try {
        void authFetch(`${BACKEND_URL}/api/cleanup/${targetCameraId}`, {
          method: "POST",
        });
      } catch (cleanupErr) {}

      setCurrentFlashingFile(t("flasher.writing"));

      let activePort = port;
      if (!activePort) {
        activePort = await (navigator as any).serial.requestPort();
        setPort(activePort);
      }

      const transport = new Transport(activePort, false);
      transportRef.current = transport;

      const silentTerminal = {
        clean: () => {},
        writeLine: (data: string) => {
          if (
            data.toLowerCase().includes("error") ||
            data.toLowerCase().includes("fail")
          ) {
            console.error(data);
          }
        },
        write: (data: string) => {
          if (
            data.toLowerCase().includes("error") ||
            data.toLowerCase().includes("fail")
          ) {
            console.error(data);
          }
        },
      };

      const loader = new ESPLoader({
        transport: transport,
        baudrate: 115200,
        terminal: silentTerminal,
      });

      await loader.main();

      await loader.writeFlash({
        fileArray,
        flashMode: "dio",
        flashFreq: "80m",
        flashSize: "4MB",
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          const percent = Math.round((written / total) * 100);
          setFlashProgress(percent);
          setCurrentFlashingFile(`${t("flasher.writingFile")}: ${percent}%`);
        },
      });

      try {
        if (typeof (loader as any).hardReset === "function") {
          await (loader as any).hardReset();
        } else {
          await transport.setRTS(true);
          await transport.setDTR(false);
          await new Promise((resolve) => setTimeout(resolve, 100));
          await transport.setRTS(false);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (resetErr) {
        console.warn("Failed to reboot camera via hardware:", resetErr);
      }

      try {
        await transport.disconnect();
      } catch (discErr) {}

      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await activePort.open({ baudRate: 115200 });
        await activePort.setSignals({
          dataTerminalReady: false,
          requestToSend: true,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        await activePort.setSignals({
          dataTerminalReady: false,
          requestToSend: false,
        });
        await activePort.close();
      } catch (sigErr) {
        console.warn("Failed reset pulse:", sigErr);
      }

      setStep("verifying");
      startPollingVerification(targetCameraId);
    } catch (err: any) {
      if (transportRef.current) {
        try {
          await transportRef.current.setRTS(false);
          await transportRef.current.setDTR(false);
          await transportRef.current.disconnect();
        } catch (discErr) {}
      }
      setErrorMsg(t("flasher.flashWriteError"));
      setStep("failed");
    }
  };

  const startPollingVerification = (targetCameraId: string) => {
    setVerificationStatus("waiting");
    setErrorMsg("");

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseToken = sessionStorage.getItem("camron_jwt") ?? "";
    const eventSource = new EventSource(
      `${BACKEND_URL}/api/confirm-status/${targetCameraId}/events?token=${encodeURIComponent(sseToken)}`,
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.confirmed) {
          eventSource.close();
          eventSourceRef.current = null;
          setStep("success");
          toast.success(t("flasher.cameraOnline"));
        }
      } catch (err) {}
    };

    eventSource.onerror = () => {
      ;
    };

    setTimeout(() => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setVerificationStatus("timeout");
      }
    }, 60000);
  };

  const handleResetWizard = () => {
    if (cameraId) {
      void authFetch(`${BACKEND_URL}/api/cleanup/${cameraId}`, {
        method: "POST",
      });
    }
    setErrorMsg("");
    setStep("connect");
    setFlashProgress(0);
    setVerificationStatus("waiting");
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center justify-center text-center gap-8 py-4 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full flex flex-col items-center gap-6"
        >
          {step === "connect" && (
            <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
              <div className="flex flex-col items-center gap-1 w-full">
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                  {t("flasher.connectUsb")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mt-1">
                  {t("flasher.connectCameraDesc")}
                </p>
              </div>

              {!serialSupported ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-left max-w-sm w-full">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <p className="text-xs font-medium">
                    {!isSecure ? t("flasher.insecureContext") : t("flasher.browserNotSupported")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 w-full max-w-xs items-center">
                  {loading ? (
                    <div className="flex flex-col items-center gap-2 mt-4 text-center">
                      <Spinner className="h-8 w-8 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">
                        {t("common.loading")}
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleConnectPort}
                      disabled={countdown > 0}
                      className="w-full mt-2 gap-2 font-semibold"
                    >
                      {countdown > 0
                        ? `${t("flasher.connectUsb")} (${countdown}s)`
                        : t("flasher.connectUsb")}
                      {countdown === 0 && (
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      )}
                    </Button>
                  )}
                </div>
              )}

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                >
                  {t("common.back")}
                </button>
              )}
            </div>
          )}

          {step === "wifi" && (
            <form
              onSubmit={handleStartCompilation}
              className="flex flex-col items-center gap-6 w-full animate-fade-in"
            >
              <div className="flex flex-col items-center gap-1 w-full">
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                  {t("flasher.enterWifiDetails")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mt-1">
                  {t("flasher.wifiDesc")}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs text-left">
                {!camerasLoading &&
                  allCameras.filter((c) => c.id !== cameraId).length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground pl-0.5">
                        {t("flasher.importCredentials")}
                      </Label>
                      <Select
                        onValueChange={(val) => {
                          const selected = allCameras.find((c) => c.id === val);
                          if (selected) {
                            setWifiSsid(selected.wifi_ssid || "");
                            setWifiPassword(selected.wifi_pass || "");
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue
                            placeholder={t("flasher.selectCameraPlaceholder")}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                          {allCameras
                            .filter((c) => c.id !== cameraId)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.wifi_ssid})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="wifi-ssid"
                    className="text-xs font-semibold text-muted-foreground pl-0.5"
                  >
                    {t("flasher.wifiSsid")}
                  </Label>
                  <Input
                    id="wifi-ssid"
                    placeholder="Ex: MinhaRede_2.4G"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    maxLength={32}
                    className="h-10"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="wifi-password"
                    className="text-xs font-semibold text-muted-foreground pl-0.5"
                  >
                    {t("flasher.wifiPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="wifi-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ex: 12345678"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      minLength={8}
                      maxLength={64}
                      className="h-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced" className="border-border">
                    <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-2 hover:no-underline font-medium">
                      {t("flasher.advancedConfig")}
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-2 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground pl-0.5">
                          {t("flasher.backendIpLabel")}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="backend-ip"
                            placeholder="Ex: 127.0.0.1"
                            value={backendIp}
                            onChange={(e) => setBackendIp(e.target.value)}
                            pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                            className="flex-1 h-10 font-mono"
                            required
                          />
                          <Input
                            id="backend-port"
                            placeholder="Port"
                            value={backendPort}
                            onChange={(e) => setBackendPort(e.target.value)}
                            pattern="^[0-9]{1,5}$"
                            className="w-20 h-10 font-mono text-center"
                            required
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex flex-col gap-3 w-full mt-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gap-2 font-semibold"
                  >
                    {t("flasher.buttonConnectUsb")}
                  </Button>
                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer text-center"
                  >
                    {t("common.back")}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === "compiling" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <div className="flex flex-col items-center gap-1 w-full">
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                  {t("flasher.compilingSoftware")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mt-1">
                  {t("flasher.compilingWait")}
                </p>
              </div>
            </div>
          )}

          {step === "flashing" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <div className="flex flex-col items-center gap-1 w-full">
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                  {t("flasher.stepFlash")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mt-1">
                  {t("flasher.writing")}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-xs">
                <div className="flex justify-between items-center text-xs text-muted-foreground pl-0.5">
                  <span className="font-medium truncate max-w-[200px]">
                    {currentFlashingFile}
                  </span>
                  <span className="font-semibold text-foreground">
                    {flashProgress}%
                  </span>
                </div>
                <Progress
                  value={flashProgress}
                  className="h-2 w-full bg-secondary"
                />
              </div>
            </div>
          )}

          {step === "verifying" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <div className="flex flex-col items-center gap-1 w-full">
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                  {t("flasher.stepVerify")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mt-1">
                  {t("flasher.waitingHandshake")}
                </p>
              </div>

              {verificationStatus === "timeout" && (
                <div className="flex flex-col gap-4 w-full max-w-xs mt-2 animate-fade-in">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-left text-xs leading-normal">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{t("flasher.flashFailedStatus")}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleResetWizard}
                      variant="outline"
                      className="flex-1 text-xs cursor-pointer"
                    >
                      {t("common.back")}
                    </Button>
                    <Button
                      onClick={() => {
                        setStep("success");
                      }}
                      className="flex-1 text-xs cursor-pointer"
                    >
                      {t("common.continue")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "failed" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <AlertCircle className="h-14 w-14 text-rose-500" />
              <div className="flex flex-col items-center gap-1 w-full">
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                  {t("common.error")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mt-1">
                  {errorMsg || t("flasher.flashFailedStatus")}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
                <Button
                  onClick={handleResetWizard}
                  variant="destructive"
                  className="w-full gap-2 font-semibold"
                >
                  {t("common.continue")}
                </Button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                  >
                    {t("common.back")}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <CheckCircle className="h-14 w-14 text-emerald-500" />
              <div className="flex flex-col items-center gap-1 w-full">
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                  {t("flasher.setupDone")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mt-1">
                  {t("flasher.handshakedSuccessfully")}
                </p>
              </div>

              <div className="w-full max-w-xs mt-2">
                <Button
                  onClick={onComplete}
                  className="w-full gap-2 font-semibold"
                >
                  {t("common.continue")}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
