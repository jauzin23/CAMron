import Link from "next/link"
import { ArrowUpRight, BookOpen, Cpu, Shield, TriangleAlert, Workflow } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { Highlighter } from "@/components/ui/highlighter"

const sections = [
  { id: "intro", label: "Introdução", icon: BookOpen },
  { id: "deps", label: "Configuração Inicial", icon: Workflow },
  { id: "running", label: "Executar o agente", icon: Cpu },
  { id: "gameplay", label: "Configurações de Jogo", icon: TriangleAlert },
  { id: "safety", label: "Segurança e Boas Práticas", icon: Shield },
]

const faq = [
  {
    q: "O VaiVarrer funciona em modo de ecrã inteiro?",
    a: "Sim. O VaiVarrer suporta tanto o modo janela como o ecrã inteiro. O único requisito é que o jogo esteja em primeiro plano no momento em que o agente inicia a sua operação.",
  },
  {
    q: "A minha conta está segura com a automação?",
    a: "A nossa tecnologia simula interações reais ao nível do hardware (rato e teclado virtuais), tornando a automação impercetível e garantindo a máxima segurança e invisibilidade durante as tuas sessões.",
  },
  {
    q: "O instalador de dependências pede permissões de administrador. É normal?",
    a: "Sim. Para garantir a invisibilidade e a precisão extrema dos cliques, o nosso sistema instala um driver de hardware simulado. É estritamente necessário reiniciar o computador após esta instalação única.",
  },
  {
    q: "Posso usar a minha licença em vários computadores?",
    a: "A licença do VaiVarrer está vinculada de forma segura à máquina (HWID) onde inicias sessão. Para transferir a licença para um novo computador, contacta o nosso suporte técnico.",
  },
]

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Manual de utilização"
        description="Instruções completas para configurar e operar o Software"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              Versão PDF
            </Button>
            <Button size="sm" className="gap-2">
              Suporte técnico
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden flex-col gap-1 lg:flex">
          <span className="px-3 pb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            nesta página
          </span>
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </Link>
          ))}
          <Separator className="my-4" />
          <div className="flex flex-col gap-2 px-3 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider">recursos</span>
            <Link href="#" className="underline-offset-4 hover:underline">
              Notas de versão
            </Link>
            <Link href="#" className="underline-offset-4 hover:underline">
              Política de utilização
            </Link>
            <Link href="#" className="underline-offset-4 hover:underline">
              Estado do serviço
            </Link>
          </div>
        </aside>

        <div className="flex flex-col gap-8">
          <Section
            id="intro"
            chapter="01"
            title="Introdução"
            description="Bem-vindo ao VaiVarrer."
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              O VaiVarrer é a melhor ferramenta  de automação do processo de serviço comunitário ingame Através deste painel tens acesso  a um agente que opera diretamente na tua máquina.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Todo o processo de decisão acontece localmente no teu computador, o que garante zero latência e total privacidade.
            </p>
          </Section>

          <Section
            id="deps"
            chapter="02"
            title="Configuração Inicial"
            description="Preparar o sistema para operação (instalação única)."
          >
            <ol className="flex flex-col gap-4 text-sm text-muted-foreground">
              <Step n={1}>
                No painel principal (Centro de Controlo), acede ao cartão de <strong>Automação</strong> e clica em <span className="font-medium text-foreground">Iniciar Agente</span>
              </Step>
              <Step n={2}>
                Se for a tua primeira vez a usar a aplicação, será necessário primeiro instalar as dependências. Clica em <span className="font-medium text-foreground">Instalar dependências</span> e permite o pedido de administrador.
              </Step>
              <Step n={3}>
                Reinicia o computador obrigatoriamente. Este passo é importante para que o sistema consiga interagir com o jogo.
              </Step>
            </ol>
          </Section>

          <Section
            id="running"
            chapter="03"
            title="Executar o agente"
            description="Como iniciar uma sessão autónoma."
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              Após garantires que a configuração inicial está feita e as dependências instaladas, vai ao Centro de Controlo e clica em <span className="font-medium text-foreground">Iniciar Agente</span>
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Durante os primeiros segundos deves maximizar e focar imediatamente a janela do teu jogo, colocando a câmara em primeira pessoa. O agente assumirá o controlo automaticamente.
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary/40 p-4 mt-2">
              <Shortcut keys={["Q"]} label="Parar a qualquer momento" />
              <Separator orientation="vertical" className="h-5" />
              <Shortcut keys={["App"]} label="Botão 'Parar Agente' no Centro de Controlo" />
            </div>
          </Section>

          <Section
            id="gameplay"
            chapter="04"
            title="Configurações de Jogo"
            description="Requisitos dentro do jogo para a máxima eficiência do bot."
          >
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <Bullet>
                <Highlighter action="underline" color="#3b82f6" strokeWidth={2}>
                  <span className="font-medium text-foreground">Câmara em Primeira Pessoa</span>
                </Highlighter>: O jogo deve estar obrigatoriamente na perspetiva de primeira pessoa (First Person). O algoritmo não processa interações em terceira pessoa (onde se vê as costas da personagem).
              </Bullet>
              <Bullet>
                <span className="font-medium text-foreground">Posicionamento da Visão</span>: Mantém a tua câmara nivelada na horizontal ao arrancar. Não inicies o agente com a visão totalmente apontada para o chão ou para o céu. Foca-te no horizonte onde os alvos costumam surgir.
              </Bullet>
              <Bullet>
                <Highlighter action="highlight" color="rgba(59, 130, 246, 0.2)">
                  <span className="font-medium text-foreground">Visibilidade Clara</span>
                </Highlighter>: Posiciona-te numa zona limpa, onde os marcadores ou alvos com os quais o agente deve interagir estejam claramente visíveis no teu ecrã.
              </Bullet>
            </ul>
          </Section>

          <Section
            id="safety"
            chapter="05"
            title="Segurança e Boas Práticas"
            description="Garantir o bom funcionamento do agente."
          >
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <Bullet>Não mexas fisicamente no teu rato nem no teclado enquanto o agente estiver "A Correr". Qualquer interferência manual corrompe a precisão de rastreio de imagem e afeta os cliques.</Bullet>
              <Bullet>Não ligues, desligues nem troques periféricos USB (como ratos extra) durante uma sessão ativa.</Bullet>
              <Bullet>Se precisares de reassumir controlo urgente, usa a tecla de segurança <span className="font-mono text-foreground">Q</span> para desligar instantaneamente o processo.</Bullet>
            </ul>
          </Section>

          <Card id="faq">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base font-semibold">Perguntas frequentes</CardTitle>
              <CardDescription>Esclarecimento das dúvidas mais comuns de novos utilizadores.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {faq.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-border px-6 last:border-b-0">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Section({
  id,
  chapter,
  title,
  description,
  children,
}: {
  id: string
  chapter: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-24">
      <div className="flex flex-col gap-1.5 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
            cap. {chapter}
          </Badge>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-secondary font-mono text-[11px] text-foreground">
          {n}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">passo {n}</span>
      </div>
      <div className="ml-9 flex flex-col gap-2 leading-relaxed">{children}</div>
    </li>
  )
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-foreground" aria-hidden="true" />
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}
