// Studio sign-in. One shared password; the form posts to /auth/login.

import { Lock } from "lucide-react";

export const metadata = { title: "Sign in · Solae Wellness Scan" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const failed = error === "1";

  return (
    <div className="flex justify-center pt-16 sm:pt-24">
      <form
        method="post"
        action="/auth/login"
        className="w-full max-w-sm bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-8"
      >
        <div className="flex items-center gap-2.5 mb-2">
          <Lock className="w-5 h-5 text-gold" />
          <h1 className="font-display text-2xl text-gold">Studio sign in</h1>
        </div>
        <p className="text-sm text-[var(--solae-text-muted)] mb-6">
          Enter the studio password to continue.
        </p>

        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          aria-invalid={failed || undefined}
          aria-describedby={failed ? "login-error" : undefined}
          className="w-full px-4 py-3 rounded-lg bg-[var(--solae-bg)] border border-[var(--solae-border)] text-[var(--solae-text)] placeholder:text-[var(--solae-text-faint)] text-sm focus:outline-none focus:border-[var(--solae-gold-dim)]"
        />

        {failed && (
          <p id="login-error" role="alert" className="text-sm text-[var(--solae-red)] mt-3">
            That password didn&rsquo;t match. Try again.
          </p>
        )}

        <button
          type="submit"
          className="w-full mt-5 px-5 py-3 rounded-lg bg-[var(--solae-gold)] text-[var(--solae-bg)] text-sm font-medium hover:bg-[var(--solae-gold-light)] transition-colors"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
