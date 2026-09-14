import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
