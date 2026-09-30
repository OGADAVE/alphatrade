import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

// NOTE: next/font/google fetches font files at build time, which requires
// live network access to fonts.googleapis.com. The font stacks below (a
// grotesk for UI, a monospace for tabular price data) are declared as CSS
// variables in globals.css using system fonts, so the build never depends
// on network access. If you want the exact Manrope / IBM Plex Mono brand
// typefaces, download the font files and load them with next/font/local
// instead — no code above this comment needs to change.

export const metadata: Metadata = {
  title: "AlphaTrade Signals — Smarter. Follow Alpha.",
  description:
    "Automated multi-source crypto and forex trading signal intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
