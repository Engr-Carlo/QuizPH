import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";

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
    <html lang="en">
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
