"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, Users, FlaskConical, LogOut } from "lucide-react";
import { Logo } from "./Logo";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/import", label: "Import Scan", icon: Upload },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/supplements", label: "Supplements", icon: FlaskConical },
];

export function Header() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  // Publish the header's height so other sticky elements (the client search
  // bar) can dock directly beneath it at any screen width.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="border-b border-[var(--solae-border-subtle)] bg-[var(--solae-bg)]/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
        </Link>
        {pathname !== "/login" && (
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
          <form method="post" action="/auth/signout" className="ml-2">
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--solae-text-faint)] hover:text-gold transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </nav>
        )}
      </div>
    </header>
  );
}
