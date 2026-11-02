import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/nav/Header";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solae Wellness Scan Dashboard",
  description:
    "Solae Longevity & Soul Studio — wellness scan analysis and recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
            {children}
          </main>
          <footer className="max-w-7xl w-full mx-auto px-6 py-6 border-t border-[var(--solae-border-subtle)]">
            <p className="text-[var(--solae-text-faint)] text-[11px] leading-relaxed">
              Solae Longevity &amp; Soul Studio provides wellness and educational
              support only. Angela Holter is not a physician and does not
              diagnose, treat, or prescribe. Wellness scan results are
              proprietary wellness-tracking scores from a non-diagnostic device —
              not medical measurements or diagnoses. For educational and
              informational purposes only.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
