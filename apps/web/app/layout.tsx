import type { Metadata } from "next";
import { Archivo, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Onside — the match official for markets",
  description:
    "A deterministic, rule-based trading agent for live World Cup matches. Every decision traces to a named rule and a real match event, and the outcome settles itself on-chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${barlowCondensed.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen bg-chalk font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
