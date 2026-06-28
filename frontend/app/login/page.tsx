"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowRight, Loader2, Target, Zap, Server } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { API_URL, setClientLicenseKey, setClientTokens } from "@/lib/api";
import { WindowControls } from "@/components/window-controls";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from "@/components/animate-ui/components/animate/avatar-group";
import { getDesktopInstallationId } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<
    { id: string; name: string; logo_url: string }[]
  >([]);

  useEffect(() => {
    // Mock servers fetch
    setServers([
      { id: "mock-1", name: "Servidor Teste 1", logo_url: "" },
      { id: "mock-2", name: "Servidor Teste 2", logo_url: "" },
    ]);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const chave = String(form.get("chave_key") ?? form.get("chave") ?? "");

    try {
      // Mock login request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (chave.length < 5) {
        throw new Error(
          "Chave inválida. Use qualquer chave com mais de 5 caracteres.",
        );
      }

      const data = {
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
      };

      setClientLicenseKey(chave);
      await setClientTokens(data.accessToken, data.refreshToken);
      toast.success("Sessão iniciada", { description: "Bem-vindo de volta." });
      router.push("/");
    } catch (err: any) {
      const isKeyError =
        err.message.includes("Chave") || err.message === "login_failed";

      toast.error(isKeyError ? "Erro de Licença" : "Acesso Negado", {
        description:
          err.message === "login_failed"
            ? "Chave de licença inválida ou expirada."
            : err.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">
      <header
        className="absolute top-0 z-50 flex h-10 w-full items-center justify-end px-4 select-none"
        style={{ "--wails-draggable": "drag" } as any}
      >
        <WindowControls />
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-zinc-950 p-12 lg:flex">
          <AnimatedGridPattern
            numSquares={35}
            maxOpacity={0.1}
            duration={3}
            repeatDelay={1}
            className="[mask-image:radial-gradient(500px_circle_at_center,white,transparent)] inset-0 h-full w-full fill-white/10 stroke-white/10"
          />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 p-1.5 backdrop-blur-sm">
              <img
                src="/logo.png"
                alt="CAMron Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight text-white">
              CAMron
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-8">
            <h2 className="text-4xl font-bold tracking-tight text-white text-balance leading-tight">
              VaiVarrer? Nunca Mais! <br /> Automação do Serviço Comunitário.
            </h2>
            <div className="space-y-5">
              {[
                { icon: Zap, text: "Deteção e execução discreta" },
                { icon: Server, text: "Suporte para múltiplos servidores" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-zinc-400">
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {servers.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  Servidores Suportados
                </span>
                <AvatarGroup className="h-[52px] -space-x-4">
                  {servers.map((server) => (
                    <Avatar
                      key={server.id}
                      className="h-[52px] w-[52px] border-2 border-zinc-950 ring-1 ring-white/5"
                    >
                      <AvatarImage src={server.logo_url} alt={server.name} />
                      <AvatarFallback className="bg-zinc-800 text-xs font-bold text-white">
                        {server.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                      <AvatarGroupTooltip>{server.name}</AvatarGroupTooltip>
                    </Avatar>
                  ))}
                </AvatarGroup>
              </div>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-4 font-mono text-[11px] text-zinc-500">
            <span>by jauzin23</span>
          </div>
        </aside>

        <section className="relative flex items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-[340px] flex-col gap-6">
            <div className="flex flex-col gap-2 lg:hidden">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center p-1.5 bg-muted/20 rounded-xl border border-muted/30">
                  <img
                    src="/app-logo.png"
                    alt="VaiVarrer Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                  VaiVarrer
                </span>
              </div>
            </div>

            <Card className="border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
                  Login
                </CardTitle>
                <CardDescription className="text-center lg:text-left">
                  Insere a tua chave de licença para aceder à tua conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <FieldGroup className="gap-6">
                    <Field>
                      <div className="flex items-center">
                        <FieldLabel htmlFor="chave_key">
                          Chave de Licença
                        </FieldLabel>
                      </div>
                      <Input
                        id="chave_key"
                        name="chave_key"
                        type="password"
                        placeholder="Insere a tua chave"
                        className="mt-1.5"
                        required
                      />
                    </Field>
                    <Button
                      type="submit"
                      className="w-full gap-2 font-semibold"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> A
                          autenticar...
                        </>
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            <p className="px-8 text-center font-mono text-[11px] text-muted-foreground">
              Ao continuar concordas com os{" "}
              <Link
                href="#"
                className="underline-offset-4 hover:underline text-foreground/40"
              >
                Termos
              </Link>{" "}
              e a{" "}
              <Link
                href="#"
                className="underline-offset-4 hover:underline text-foreground/40"
              >
                Privacidade
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
