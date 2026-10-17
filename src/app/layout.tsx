import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#1F4B99",
};

export const metadata: Metadata = {
  title: "QuizPH - Smart Quiz Platform",
  description: "A quiz platform with anti-cheat monitoring for Philippine educators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/api/manifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QuizPH" />
      </head>
      <body className="antialiased">
        <SessionProvider>
          <PresenceHeartbeat />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
