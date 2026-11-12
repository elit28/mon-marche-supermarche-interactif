import type { Metadata, Viewport } from "next";
import { figtree, fraunces } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: { default: "MON MARCHÉ — vos courses, rayon par rayon", template: "%s · MON MARCHÉ" },
  description:
    "Supermarché virtuel français open source : parcourez de vrais rayons, de vrais produits et remplissez votre panier en un geste. Démonstration, prix fictifs.",
  applicationName: "MON MARCHÉ",
  openGraph: { type: "website", locale: "fr_FR", siteName: "MON MARCHÉ" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fafaf5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${figtree.variable}`}>
      <body className="store-wall antialiased">{children}</body>
    </html>
  );
}
