import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "OffGrid — Production Incident Simulator",
  description:
    "Debug real P0 outages in an interactive terminal. Multilingual voice dispatch (EN/HI/KN), AI postmortem, and shareable Decision Replay scorecards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-[#F3EEFF] text-[#24112B] font-sans antialiased selection:bg-[#24112B]/20">
        {children}
      </body>
    </html>
  );
}

