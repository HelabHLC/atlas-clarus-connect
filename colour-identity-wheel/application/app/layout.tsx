import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLAS Clarus Reference Wheel",
  description: "Explore 13,283 documented ATLAS Clarus colour references across 19 lightness levels.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
