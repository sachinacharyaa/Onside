import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onside — Settling Agent",
  description:
    "Autonomous, rule-based trading agent for live World Cup markets. Every decision traces to an explicit rule; the outcome settles on-chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
