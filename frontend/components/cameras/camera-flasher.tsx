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
import { type Camera } from "@/lib/api";

interface CameraFlasherProps {
  camera?: Camera;
  cameraName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onStepChange?: (step: FlashingStep) => void;
}

type FlashingStep =
  | "connect" // USB Connection / Serial Handshake
  | "wifi" // Wi-Fi credentials form
  | "compiling" // Processing compiling logs (non-technical spinner)
  | "flashing" // Writing firmware via esptool-js
  | "verifying" // Long-polling first boot confirmation
  | "success" // Completed successfully
  | "failed"; // Error state

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
}: CameraFlasherProps) {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [step, setStepState] = useState<FlashingStep>("connect");
  const setStep = (newStep: FlashingStep) => {
    setStepState(newStep);
    onStepChange?.(newStep);
  };
  const [loading, setLoading] = useState<boolean>(false);
  const [serialSupported, setSerialSupported] = useState<boolean>(false);

  // Countdown timer for user guidance
  const [countdown, setCountdown] = useState<number>(5);

  // Serial Port connection refs and states
  const [port, setPort] = useState<any>(null);
  const transportRef = useRef<any>(null);
  const isFirstLoadRef = useRef<boolean>(true);

  // Wi-Fi and Camera configuration
  const [wifiSsid, setWifiSsid] = useState<string>("");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [backendIp, setBackendIp] = useState<string>("127.0.0.1");
  const [backendPort, setBackendPort] = useState<string>("3000");

  // Camera settings
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [newCameraName, setNewCameraName] = useState<string>("");
  const [isReflash, setIsReflash] = useState<boolean>(false);
  const [detectedCameraName, setDetectedCameraName] = useState<string>("");

  // List of other cameras to import credentials from
  const [allCameras, setAllCameras] = useState<Camera[]>([]);

  // Flashing progress
  const [flashProgress, setFlashProgress] = useState<number>(0);
  const [currentFlashingFile, setCurrentFlashingFile] = useState<string>("");

  // Boot verification after flashing
  const [verificationStatus, setVerificationStatus] = useState<
    "waiting" | "timeout"
  >("waiting");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Error message
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Live serial logs after flashing
  const [serialLogs, setSerialLogs] = useState<string>("");
  const verificationReaderRef = useRef<any>(null);
  const verificationPortOpenRef = useRef<boolean>(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Load camera props if passed
  useEffect(() => {
    if (camera) {
      setCameraId(camera.id);
      setWifiSsid(camera.wifi_ssid || "");
      setWifiPassword(camera.wifi_pass || "");
      setIsReflash(true);
      setDetectedCameraName(camera.name);
    }
  }, [camera]);

  // Check Web Serial support
  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && "serial" in navigator) {
      setSerialSupported(true);
    }
  }, [isMounted]);

  // Scroll serial logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [serialLogs]);

  // Guidance timer
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

  // Retrieve network info and fetch list of cameras for import dropdown
  useEffect(() => {
    if (isMounted) {
      const fetchNetworkInfo = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/network-info`);
          if (res.ok) {
            const data = await res.json();
            setBackendIp(data.ip);
            setBackendPort(data.port.toString());
          }
        } catch (err) {}
      };
      void fetchNetworkInfo();

      const fetchCameras = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/cameras`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              // Filter to show only cameras with credentials already saved
              const configured = data.filter((c) => c.wifi_ssid);
              setAllCameras(configured);
            }
          }
        } catch (err) {}
      };
      void fetchCameras();
    }
  }, [isMounted]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Step 1: Connect to USB and perform Serial Handshake check
  const handleConnectPort = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { ESPLoader, Transport } = await import("esptool-js");

      // Open browser native port picker
      const activePort = await (navigator as any).serial.requestPort();
      if (!activePort) {
        throw new Error("Nenhuma ligação USB selecionada.");
      }

      setPort(activePort);

      // 1. Handshake check using native Web Serial reader/writer (bypasses SLIP parser)
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
            // Write handshake command
            await writer.write(encoder.encode("CAMRON_HANDSHAKE\n"));

            // Read response chunk with race timeout
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
          "Erro no handshake série, prosseguindo normalmente:",
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

      // 2. Process results
      if (detectedId) {
        console.log("Handshake bem-sucedido! ID Detetado:", detectedId);
        try {
          const res = await fetch(`${BACKEND_URL}/api/cameras/${detectedId}`);
          if (res.ok) {
            const existingCamera = await res.json();
            if (existingCamera && existingCamera.id) {
              setCameraId(existingCamera.id);
              setWifiSsid(existingCamera.wifi_ssid || "");
              setWifiPassword(existingCamera.wifi_pass || "");
              setIsReflash(true);
              setDetectedCameraName(existingCamera.name);
              toast.success(
                `Câmara "${existingCamera.name}" detetada por USB!`,
              );
            }
          }
        } catch (fetchErr) {
          console.error("Erro a obter dados da câmara detetada:", fetchErr);
        }
        setStep("wifi");
      } else {
        // Handshake failed or timed out: verify it's a valid ESP32 using the prototype's original loader.main() method
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
        setErrorMsg(
          "A ligação USB parece estar em uso por outro programa. Feche outros programas e tente novamente.",
        );
      } else if (
        err.name === "NotFoundError" ||
        err.message.includes("User cancelled")
      ) {
        setErrorMsg("Ligação USB cancelada pelo utilizador.");
      } else {
        setErrorMsg(
          "Não foi possível encontrar a câmara. Verifique se o cabo está bem inserido.",
        );
      }
      setStep("failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Trigger compilation
  const handleStartCompilation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid || !wifiPassword) {
      toast.error("Por favor, preencha o Wi-Fi e a Palavra-passe.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setStep("compiling");

    try {
      const response = await fetch(`${BACKEND_URL}/api/compile/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wifi_ssid: wifiSsid,
          wifi_password: wifiPassword,
          custom_host: backendIp,
          custom_port: parseInt(backendPort, 10),
          cameraId: cameraId, // will be null for new camera, backend generates one
          name: isReflash ? detectedCameraName : newCameraName || cameraName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao iniciar compilação.");
      }

      const { cameraId: generatedId } = await response.json();
      setCameraId(generatedId);

      // Open SSE stream for compilation logs
      const eventSource = new EventSource(
        `${BACKEND_URL}/api/compile/stream/${generatedId}`,
      );

      eventSource.addEventListener("complete", (event: any) => {
        eventSource.close();
        // Compile succeeded, proceed to write binaries via Web Serial
        void handleFlashDevice(generatedId);
      });

      eventSource.addEventListener("error", () => {
        eventSource.close();
        setErrorMsg(
          "Ocorreu um erro a preparar o software da câmara. Tente de novo.",
        );
        setStep("failed");
        void fetch(`${BACKEND_URL}/api/cleanup/${generatedId}`, {
          method: "POST",
        }).catch(() => {});
      });
    } catch (err: any) {
      setStep("failed");
      setErrorMsg("Ocorreu um erro interno. Tente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Write binaries using esptool-js
  const handleFlashDevice = async (targetCameraId: string) => {
    setStep("flashing");
    setFlashProgress(0);
    setCurrentFlashingFile("A descarregar ficheiros...");
    setErrorMsg("");

    try {
      const { ESPLoader, Transport } = await import("esptool-js");

      // Download compiled binaries in parallel from backend
      const filesToFlash = [
        { name: "bootloader.bin", address: 0x1000 },
        { name: "partitions.bin", address: 0x8000 },
        { name: "boot_app0.bin", address: 0xe000 },
        { name: "firmware.bin", address: 0x10000 },
      ];

      const fileArray = await Promise.all(
        filesToFlash.map(async (fileInfo) => {
          const downloadUrl = `${BACKEND_URL}/api/download/${targetCameraId}/${fileInfo.name}`;
          const res = await fetch(downloadUrl);
          if (!res.ok) {
            throw new Error(`Falha ao obter ficheiro ${fileInfo.name}.`);
          }
          const buf = await res.arrayBuffer();
          return {
            data: new Uint8Array(buf),
            address: fileInfo.address,
          };
        }),
      );

      // Trigger asynchronous folder cleanup on server
      try {
        void fetch(`${BACKEND_URL}/api/cleanup/${targetCameraId}`, {
          method: "POST",
        });
      } catch (cleanupErr) {}

      setCurrentFlashingFile("A ligar à câmara...");

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

      // Write flash with settings optimal for ESP32-CAM (80MHz, DIO, 4MB)
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
          setCurrentFlashingFile(
            `A enviar software para a câmara: ${percent}%`,
          );
        },
      });

      // Disconnect cleanly to let ESP32 reboot and start Wi-Fi connection
      try {
        if (typeof (loader as any).hardReset === "function") {
          await (loader as any).hardReset();
        } else {
          // Manual hardware reset sequence for ESP32
          await transport.setRTS(true);
          await transport.setDTR(false);
          await new Promise((resolve) => setTimeout(resolve, 100));
          await transport.setRTS(false);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (resetErr) {
        console.warn("Falha ao reiniciar câmara via hardware:", resetErr);
      }

      try {
        await transport.disconnect();
      } catch (discErr) {}

      // Move to verification step
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
      setErrorMsg(
        "Ocorreu um erro a gravar na câmara. Verifique o cabo e tente novamente.",
      );
      setStep("failed");
    }
  };

  const stopSerialLogs = async () => {
    if (verificationReaderRef.current) {
      try {
        await verificationReaderRef.current.cancel();
      } catch (e) {}
      verificationReaderRef.current = null;
    }
    if (port && verificationPortOpenRef.current) {
      try {
        await port.setSignals({
          dataTerminalReady: false,
          requestToSend: false,
        });
      } catch (e) {}
      try {
        await port.close();
      } catch (e) {}
      verificationPortOpenRef.current = false;
    }
  };

  // Step 4: Long-polling verification
  const startPollingVerification = (targetCameraId: string) => {
    setVerificationStatus("waiting");
    setSerialLogs("");

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    // Start raw serial read loop for diagnostics
    const readSerialLogs = async () => {
      try {
        let activePort = port;
        if (!activePort) {
          console.warn("Nenhuma porta série disponível para ler logs.");
          return;
        }

        // Wait a brief moment to ensure the flash port has disconnected fully
        await new Promise((resolve) => setTimeout(resolve, 300));

        await activePort.open({ baudRate: 115200 });
        verificationPortOpenRef.current = true;

        // Reset the ESP32 and ensure RTS/DTR are released so it runs normally
        try {
          await activePort.setSignals({
            dataTerminalReady: false,
            requestToSend: true,
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
          await activePort.setSignals({
            dataTerminalReady: false,
            requestToSend: false,
          });
        } catch (e) {
          console.warn("Failed to toggle RTS/DTR for reboot:", e);
        }

        const decoder = new TextDecoder();
        const reader = activePort.readable.getReader();
        verificationReaderRef.current = reader;

        setSerialLogs("--- A iniciar consola de diagnóstico série ---\n");

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            const text = decoder.decode(value);
            setSerialLogs((prev) => prev + text);
          }
        }
      } catch (err: any) {
        console.warn("Erro no leitor série de logs:", err);
        setSerialLogs(
          (prev) =>
            prev +
            `\n[Consola desativada ou câmara desligada: ${err.message}]\n`,
        );
      } finally {
        verificationPortOpenRef.current = false;
      }
    };
    // void readSerialLogs(); // Disabled to prevent locking the serial port and keeping the ESP32 in reset, allowing the user to use Arduino IDE Serial Monitor

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/confirm-status/${targetCameraId}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.confirmed) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            void stopSerialLogs();
            setStep("success");
            toast.success("Câmara configurada e ligada com sucesso!");
          }
        }
      } catch (err) {}
    }, 2000);

    // Timeout verification after 60 seconds
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        setVerificationStatus("timeout");
        void stopSerialLogs();
      }
    }, 60000);
  };

  const handleResetWizard = () => {
    if (cameraId) {
      void fetch(`${BACKEND_URL}/api/cleanup/${cameraId}`, { method: "POST" });
    }
    setErrorMsg("");
    setStep("connect");
    setFlashProgress(0);
    setVerificationStatus("waiting");
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center text-center gap-8 py-6 px-4 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full flex flex-col items-center gap-6"
        >
          {/* STEP 1: Connect USB */}
          {step === "connect" && (
            <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Usb className="h-10 w-10 text-primary" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  1. Ligar o cabo USB
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  Ligue a sua câmara "{cameraName}" ao computador utilizando o cabo USB.
                </p>
              </div>

              {!serialSupported ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-left max-w-sm w-full">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <p className="text-xs font-medium">
                    O seu navegador não suporta ligação série. Por favor,
                    utilize o Google Chrome ou Microsoft Edge.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 w-full max-w-xs items-center">
                  {loading ? (
                    <div className="flex flex-col items-center gap-2 mt-4 text-center">
                      <Spinner className="h-8 w-8 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">
                        A procurar a câmara...
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleConnectPort}
                      disabled={countdown > 0}
                      size="lg"
                      className="w-full h-11 text-sm font-semibold cursor-pointer shadow-md mt-2"
                    >
                      {countdown > 0
                        ? `Já liguei a câmara (${countdown}s)`
                        : "Já liguei a câmara"}
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
                  Voltar
                </button>
              )}
            </div>
          )}

          {/* STEP 2: Wi-Fi Setup Form */}
          {step === "wifi" && (
            <form
              onSubmit={handleStartCompilation}
              className="flex flex-col items-center gap-6 w-full animate-fade-in"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Wifi className="h-10 w-10 text-primary" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {camera?.wifi_ssid
                    ? `Reconfigurar câmara "${cameraName}"`
                    : `Configurar câmara "${cameraName}"`}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  {camera?.wifi_ssid
                    ? "Atualize as definições de rede da sua câmara."
                    : "Introduza os dados da sua rede Wi-Fi para que a câmara se possa ligar."}
                </p>
              </div>

              {/* Compact Form Layout */}
              <div className="flex flex-col gap-3 w-full max-w-xs text-left">
                {/* Import settings dropdown (only show if other cameras exist) */}
                {allCameras.filter((c) => c.id !== cameraId).length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground pl-0.5">
                      Importar definições de outra câmara
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
                      <SelectTrigger className="h-10 text-sm bg-background border-input text-foreground focus:ring-primary">
                        <SelectValue placeholder="Selecione uma câmara..." />
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
                    Nome do Wi-Fi (SSID)
                  </Label>
                  <Input
                    id="wifi-ssid"
                    placeholder="Ex: MinhaRede_2.4G"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    maxLength={32}
                    className="h-10 text-sm bg-background border-input text-foreground focus-visible:ring-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="wifi-password"
                    className="text-xs font-semibold text-muted-foreground pl-0.5"
                  >
                    Palavra-passe
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
                      className="pr-10 h-10 text-sm bg-background border-input text-foreground focus-visible:ring-primary"
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
                      Opções Avançadas (Opcional)
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-2 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground pl-0.5">
                          Endereço do Servidor
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="backend-ip"
                            placeholder="Ex: 192.168.1.50"
                            value={backendIp}
                            onChange={(e) => setBackendIp(e.target.value)}
                            pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                            className="flex-1 h-10 text-sm bg-background border-input text-foreground font-mono"
                            required
                          />
                          <Input
                            id="backend-port"
                            placeholder="Porta"
                            value={backendPort}
                            onChange={(e) => setBackendPort(e.target.value)}
                            pattern="^[0-9]{1,5}$"
                            className="w-20 h-10 text-sm bg-background border-input text-foreground font-mono text-center"
                            required
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                          IP e porta onde o CAMron está a correr. Geralmente não
                          precisa de ser alterado.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex flex-col gap-3 w-full mt-3">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full h-11 text-sm font-semibold cursor-pointer shadow-sm"
                  >
                    Instalar Software
                  </Button>
                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer text-center"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: Compiling Progress */}
          {step === "compiling" && (
            <div className="flex flex-col items-center gap-6 w-full py-8 animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  A preparar o software...
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Estamos a configurar o software especificamente para a sua
                  câmara. Demora cerca de 10-20 segundos.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Flashing Progress */}
          {step === "flashing" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <Cpu className="h-10 w-10 text-primary" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  A instalar software...
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  A enviar o software para o chip da câmara. Por favor,{" "}
                  <strong>não desligue o cabo USB</strong>.
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

          {/* STEP 5: Verifying boot */}
          {step === "verifying" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  A ligar à rede...
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  A câmara está a iniciar e a estabelecer ligação à sua rede
                  Wi-Fi.
                </p>
              </div>

              {verificationStatus === "timeout" && (
                <div className="flex flex-col gap-4 w-full max-w-xs mt-2 animate-fade-in">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-left text-xs leading-normal">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Não conseguimos confirmar a ligação. Verifique se o Wi-Fi
                      está a funcionar ou desligue e volte a ligar a câmara.
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleResetWizard}
                      variant="outline"
                      className="flex-1 text-xs cursor-pointer"
                    >
                      Tentar de Novo
                    </Button>
                    <Button
                      onClick={() => {
                        setStep("success");
                      }}
                      className="flex-1 text-xs cursor-pointer"
                    >
                      Ignorar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: General failure */}
          {step === "failed" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="h-10 w-10 text-rose-500" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  Ocorreu um erro
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {errorMsg || "Não foi possível concluir a configuração."}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
                <Button
                  onClick={handleResetWizard}
                  size="lg"
                  className="w-full h-11 text-sm font-semibold cursor-pointer shadow-md bg-rose-600 hover:bg-rose-500 text-zinc-50 border-transparent"
                >
                  Tentar Novamente
                </Button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                  >
                    Voltar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  Configuração Concluída!
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  A sua câmara foi configurada com sucesso e já está ligada à
                  rede sem fios.
                </p>
              </div>

              <div className="w-full max-w-xs mt-2">
                <Button
                  onClick={onComplete}
                  size="lg"
                  className="w-full h-11 text-sm font-semibold cursor-pointer shadow-md bg-emerald-600 hover:bg-emerald-500 text-zinc-50 border-transparent"
                >
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
