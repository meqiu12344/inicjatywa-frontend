import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MarketingTags } from "@/components/analytics/MarketingTags";
import "@/lib/logger"; // Initialize console logger

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "Inicjatywa Katolicka",
    template: "%s | Inicjatywa Katolicka",
  },
  description: "Odkryj wydarzenia katolickie w swojej okolicy. Rekolekcje, pielgrzymki, spotkania modlitewne i więcej.",
  keywords: ["wydarzenia katolickie", "rekolekcje", "pielgrzymki", "spotkania modlitewne", "kościół", "wiara", "inicjatywa", "katolicka", "Inicjatywa Katolicka", "Wydarzenia Katolickie"],
  authors: [{ name: "Inicjatywa Katolicka" }],
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "Inicjatywa Katolicka",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  other: {
    // Weryfikacja domeny Meta (Facebook/Instagram)
    "facebook-domain-verification": "gipg6nxvn2yq8m8vmigdt1ilh2k7h4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden" suppressHydrationWarning>
        <MarketingTags />
        <Providers>
          <Navbar />
          
          <main className="">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
