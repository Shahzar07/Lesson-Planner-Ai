import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* ------------------------------------------------------------------ *
 * Type system — self-hosted, so there is no render-blocking request to
 * a font CDN and no flash of fallback text.
 *
 * Display: Bricolage Grotesque. Tight, heavy, optically sized, and it
 * holds its density at 68px where a neutral UI face goes limp.
 * Text:    Plus Jakarta Sans. Legible at 11–16px, which Bricolage is not.
 * Urdu:    Noto Nastaliq Urdu, not preloaded — it only downloads on a
 *          page that actually renders Urdu.
 * ------------------------------------------------------------------ */

const display = localFont({
  src: "../public/fonts/BricolageGrotesque.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--ff-display",
  preload: true,
  fallback: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
  // Keeps the fallback occupying the same space, so nothing shifts on swap.
  adjustFontFallback: "Arial",
});

const sans = localFont({
  src: "../public/fonts/PlusJakartaSans.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--ff-sans",
  preload: true,
  fallback: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

const urdu = localFont({
  src: "../public/fonts/NotoNastaliqUrdu.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--ff-urdu",
  preload: false,
  fallback: ["Jameel Noori Nastaleeq", "Nafees Nastaleeq", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Sabaq AI — Lesson plans that pass inspection",
    template: "%s · Sabaq AI",
  },
  description:
    "Authentic B.Ed-standard lesson planning for Pakistani teachers. Knows Cambridge, the Sindh Board and Oxford. English and اردو. Free to use.",
  keywords: [
    "lesson plan", "B.Ed lesson plan", "Cambridge lesson plan", "Sindh Board",
    "Oxford Pakistan", "سبقی خاکہ", "teaching practice", "Pakistan teachers",
  ],
  openGraph: {
    title: "Sabaq AI — Lesson plans that pass inspection",
    description:
      "B.Ed-standard lesson plans in your school's exact format. Cambridge, Sindh Board, Oxford, FBISE. English and Urdu.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${urdu.variable}`}>
      <body>{children}</body>
    </html>
  );
}
