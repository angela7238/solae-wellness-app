"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, Users, FlaskConical } from "lucide-react";
import { Logo } from "./Logo";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/import", label: "Import Scan", icon: Upload },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/supplements", label: "Supplements", icon: FlaskConical },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[var(--solae-border-subtle)] bg-[var(--solae-bg)]/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-2">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "text-gold border-b-2 border-[var(--solae-gold)] -mb-[1px]"
                    : "text-[var(--solae-text-muted)] hover:text-[var(--solae-text)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
