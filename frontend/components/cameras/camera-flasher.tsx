"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
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
  Eye,
  EyeOff,
} from "lucide-react";

interface CameraFlasherProps {
  cameraName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

type FlashingStep =
  | "connect" // USB Connection instructions
  | "select_port" // COM port selection
  | "connecting" // Connection loader
  | "wifi" // SSID and Password form
  | "flashing" // Progress simulation
  | "success"; // Verification & final screen

export function CameraFlasher({
  cameraName = "ESP32-CAM",
  onComplete,
  onCancel,
}: CameraFlasherProps) {
  const [step, setStep] = useState<FlashingStep>("connect");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPort, setSelectedPort] = useState<string>("COM3");

  // Wi-Fi inputs
  const [wifiSsid, setWifiSsid] = useState<string>("");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Flashing progress
  const [flashProgress, setFlashProgress] = useState<number>(0);

  const handleConnectClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("select_port");
    }, 1000);
  };

  const handleConnectPort = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("wifi");
    }, 1200);
  };

  const handleStartFlashing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid) {
      toast.error("Por favor, indique o nome do Wi-Fi.");
      return;
    }

    setStep("flashing");
    setFlashProgress(0);

    const interval = setInterval(() => {
      setFlashProgress((prev) => {
        const nextProgress = prev + Math.floor(Math.random() * 8) + 4;

        if (nextProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStep("success");
            toast.success("Configuração gravada com sucesso!");
          }, 800);
          return 100;
        }
        return nextProgress;
      });
    }, 400); // Takes ~8-10 seconds total
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center text-center gap-8 py-6 px-4">
      {/* STEP 1: Connect USB */}
      {step === "connect" && (
        <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
          {/* Centered USB Icon with ring matching done step layout */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Usb className="h-10 w-10 text-primary" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-foreground">
              1. Ligar a câmara por USB
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Ligue a sua câmara {cameraName} a uma porta USB do seu computador
              utilizando o cabo fornecido.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 mt-2">
              <Spinner className="h-8 w-8 text-primary" />
              <span className="text-xs text-muted-foreground">
                A detetar ligação...
              </span>
            </div>
          ) : (
            <Button
              onClick={handleConnectClick}
              size="lg"
              className="w-full max-w-xs h-11 text-sm font-semibold cursor-pointer shadow-md"
            >
              Já liguei a câmara
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* STEP 2: Choose Connection */}
      {step === "select_port" && (
        <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Cpu className="h-10 w-10 text-primary" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-foreground">
              2. Escolher ligação
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Indique qual das ligações USB detetadas pertence à sua câmara.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs text-left">
            <Label
              htmlFor="usb-port-select"
              className="text-xs font-semibold text-muted-foreground pl-0.5"
            >
              Porta de ligação
            </Label>
            <Select value={selectedPort} onValueChange={setSelectedPort}>
              <SelectTrigger
                id="usb-port-select"
                className="w-full h-10 text-sm bg-background border-input text-foreground"
              >
                <SelectValue placeholder="Selecione a ligação..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value="COM3">
                  Ligação USB Principal (Porta 1)
                </SelectItem>
                <SelectItem value="COM4">
                  Ligação USB Secundária (Porta 2)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 mt-2">
              <Spinner className="h-8 w-8 text-primary" />
              <span className="text-xs text-muted-foreground">A ligar...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
              <Button
                onClick={handleConnectPort}
                size="lg"
                className="w-full h-11 text-sm font-semibold cursor-pointer"
              >
                Confirmar ligação
              </Button>
              <button
                type="button"
                onClick={() => setStep("connect")}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Connecting loader */}
      {step === "connecting" && (
        <div className="flex flex-col items-center justify-center gap-4 py-8 animate-fade-in">
          <Spinner className="h-10 w-10 text-primary animate-spin" />
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold text-foreground text-sm">
              A estabelecer ligação...
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Aguarde enquanto abrimos a ligação USB do computador.
            </p>
          </div>
        </div>
      )}

      {/* STEP 4: Wi-Fi Setup Form */}
      {step === "wifi" && (
        <form
          onSubmit={handleStartFlashing}
          className="flex flex-col items-center gap-6 w-full animate-fade-in"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Wifi className="h-10 w-10 text-primary" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-foreground">
              3. Configurar internet
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Introduza a rede de casa para que a câmara se consiga ligar sem
              fios.
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-xs text-left">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="wifi-name"
                className="text-xs font-semibold text-muted-foreground pl-0.5"
              >
                Nome do seu Wi-Fi
              </Label>
              <Input
                id="wifi-name"
                placeholder="Ex: Wi-Fi de Casa"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                className="h-10 text-sm bg-background border-input text-foreground"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="wifi-password"
                className="text-xs font-semibold text-muted-foreground pl-0.5"
              >
                Palavra-passe do Wi-Fi
              </Label>
              <div className="relative">
                <Input
                  id="wifi-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ex: 12345678"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="pr-10 h-10 text-sm bg-background border-input text-foreground"
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
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-sm font-semibold cursor-pointer shadow-sm"
            >
              Gravar na câmara
            </Button>
            <button
              type="button"
              onClick={() => setStep("select_port")}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: Flashing Progress */}
      {step === "flashing" && (
        <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <RefreshCw className="h-10 w-10 text-primary animate-spin" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-foreground">
              A configurar a câmara...
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              A gravar a informação necessária. Por favor,{" "}
              <strong>não desligue a câmara</strong> do computador.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs">
            <div className="flex justify-between items-center text-xs text-muted-foreground pl-0.5">
              <span>Progresso</span>
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

      {/* STEP 6: Success */}
      {step === "success" && (
        <div className="flex flex-col items-center gap-6 w-full py-4 animate-fade-in">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-foreground">
              Câmara configurada!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Tudo pronto. O software foi gravado com sucesso e a câmara já se
              pode ligar à sua rede Wi-Fi.
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
    </div>
  );
}
