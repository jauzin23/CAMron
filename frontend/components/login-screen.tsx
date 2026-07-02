"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, type Language } from "@/lib/language-context";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LoginScreen() {
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Only allow digits, max 6 characters
    if (/^\d{0,6}$/.test(value)) {
      setPin(value);
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (pin.length < 4) {
      setError(t("login.pinLengthError"));
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await login(pin);

    if (!result.success) {
      setError(result.error || t("login.incorrectPin"));
      setPin("");
      inputRef.current?.focus();
    }

    setIsLoading(false);
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4 z-50">
        <Select
          value={language}
          onValueChange={(val) => setLanguage(val as Language)}
        >
          <SelectTrigger
            size="sm"
            className="w-[105px] h-8 text-xs gap-1.5 bg-secondary/20 border-border/50"
          >
            <Globe className="h-3.5 w-3.5 opacity-70 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-200">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full max-w-sm">
        {/* PIN form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("login.restrictedAccess")}
            </CardTitle>
            <CardDescription>{t("login.enterPin")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pin-input">PIN</Label>
                <Input
                  id="pin-input"
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder={t("login.placeholder")}
                  value={pin}
                  onChange={handlePinChange}
                  autoComplete="current-password"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "pin-error" : undefined}
                  disabled={isLoading}
                />
                {error && (
                  <p
                    id="pin-error"
                    className="text-sm text-destructive-foreground"
                  >
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || pin.length < 4}
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
