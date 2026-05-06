import Link from "next/link";
import { Users, Upload } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh]">
      {/* Centered logo */}
      <div className="flex flex-col items-center text-center mb-16">
        <div className="font-brand text-7xl md:text-8xl text-gold tracking-[0.25em] mb-4 leading-none">
          SOLAE
        </div>
        <div className="font-brand text-xs md:text-sm text-gold-dim tracking-[0.4em]">
          LONGEVITY &amp; SOUL STUDIO
        </div>
        <div className="w-12 h-px bg-[var(--solae-gold-dim)] my-6" />
        <div className="text-[var(--solae-text-muted)] font-display italic text-base md:text-lg max-w-md">
          Wellness that changes everything.
        </div>
        <div className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase mt-3">
          Wellness Scan Dashboard
        </div>
      </div>

      {/* Two main actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        <Link
          href="/clients"
          className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] hover:border-[var(--solae-gold-dim)] rounded-xl p-8 flex flex-col items-center text-center transition-colors group"
        >
          <Users className="w-10 h-10 text-gold mb-4 group-hover:scale-110 transition-transform" />
          <div className="font-display text-2xl text-[var(--solae-text)] mb-1">
            Client History
          </div>
          <div className="text-[var(--solae-text-muted)] text-sm">
            View saved clients and their wellness journey
          </div>
        </Link>

        <Link
          href="/import"
          className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] hover:border-[var(--solae-gold-dim)] rounded-xl p-8 flex flex-col items-center text-center transition-colors group"
        >
          <Upload className="w-10 h-10 text-gold mb-4 group-hover:scale-110 transition-transform" />
          <div className="font-display text-2xl text-[var(--solae-text)] mb-1">
            Import Scan
          </div>
          <div className="text-[var(--solae-text-muted)] text-sm">
            Upload a new Wellness Scan Co PDF
          </div>
        </Link>
      </div>
    </div>
  );
}
