"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, type Language } from "@/lib/language-context";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WarpBackground } from "@/components/ui/warp-background";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function LoginScreen() {
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function performLogin(targetPin: string) {
    setIsLoading(true);
    setError(null);

    const result = await login(targetPin);

    if (!result.success) {
      setError(result.error || t("login.incorrectPin"));
      setPin("");
    }

    setIsLoading(false);
  }

  function handlePinChange(value: string) {
    if (/^\d{0,4}$/.test(value)) {
      setPin(value);
      setError(null);

      if (value.length === 4) {
        performLogin(value);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (pin.length !== 4) {
      setError(t("login.pinLengthError"));
      return;
    }

    if (!isLoading) {
      performLogin(pin);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 px-4 overflow-hidden select-none">
      <WarpBackground className="absolute inset-0 size-full rounded-none border-none p-0 bg-transparent opacity-40 pointer-events-none">
        {null}
      </WarpBackground>

      <div className="absolute top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1 bg-zinc-900/60 border-zinc-800/40 text-zinc-300 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 opacity-60 text-zinc-400" />
              <span>{language === "en" ? "EN" : "PT"}</span>
            </Button>
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

      <div className="relative z-10 w-full max-w-[360px]">
        <Card className="w-full">
          <CardHeader className="flex flex-col items-center space-y-2 pb-4 pt-6">
            <div className="flex h-15 w-15 items-center justify-center overflow-hidden mb-1">
              <img
                src="/logo.png"
                alt="CAMron Logo"
                className="h-15 w-15 object-contain"
              />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight text-center">
              CAMron
            </CardTitle>
            <CardDescription className="text-center text-xs text-muted-foreground max-w-[265px] mx-auto">
              {t("login.enterPin")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-6 px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <InputOTP
                  id="pin-input"
                  maxLength={4}
                  value={pin}
                  onChange={handlePinChange}
                  disabled={isLoading}
                  autoFocus
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                {error && (
                  <p
                    id="pin-error"
                    className="text-xs text-rose-500 font-medium text-center mt-1"
                  >
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-9 text-xs font-semibold cursor-pointer"
                disabled={isLoading || pin.length !== 4}
              >
                {isLoading ? t("login.verifying") : t("login.enter")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
