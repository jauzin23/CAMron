import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { TopBar } from "@/components/top-bar";

import "./globals.css";
import {
  Plus_Jakarta_Sans as V0_Font_Plus_Jakarta_Sans,
  IBM_Plex_Mono as V0_Font_IBM_Plex_Mono,
  Lora as V0_Font_Lora,
} from "next/font/google";

const plusJakartaSans = V0_Font_Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});
const ibmPlexMono = V0_Font_IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  variable: "--font-mono",
});
const lora = V0_Font_Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "CAMron",
  description: "Self-hosted IP camera cluster management dashboard.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark bg-background ${plusJakartaSans.variable} ${ibmPlexMono.variable} ${lora.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-50 flex flex-col h-screen w-screen overflow-hidden" suppressHydrationWarning>
        <TopBar />
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
