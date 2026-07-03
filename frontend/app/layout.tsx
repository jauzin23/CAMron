import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { DeviceProvider } from "@/lib/device-context";
import { LanguageProvider } from "@/lib/language-context";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CAMron",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      className={`dark ${geistSans.variable} ${geistMono.variable} bg-background h-screen overflow-hidden`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased h-screen overflow-hidden" suppressHydrationWarning>
        <LanguageProvider>
          <DeviceProvider>
            {children}
          </DeviceProvider>
        </LanguageProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

