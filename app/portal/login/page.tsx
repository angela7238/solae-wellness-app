"use client";
import { useState } from "react";
export default function PortalLogin() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="guide-shell max-w-lg mx-auto">
    <p className="guide-eyebrow">YOUR PRIVATE SOLAE PAGE</p><h1>Welcome back.</h1>
    <p>Sign in to read the summaries Angela has reviewed for you.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage("");
      const form = new FormData(event.currentTarget);
      try {
        const response = await fetch("/api/portal/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) });
        const data = await response.json(); setMessage(data.message || data.error);
      } catch { setMessage("We couldn't request your link. Please try again."); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="portal-email">Your email</label>
      <input id="portal-email" name="email" type="email" autoComplete="email" required />
      <button disabled={busy} type="submit">{busy ? "Requesting your link…" : "Email me a sign-in link"}</button>
    </form>
    <p role="status">{message}</p>
    <p className="guide-muted">Use the email Angela enabled for you. Links expire; if yours doesn&apos;t work, request a fresh one and open it in the same browser.</p>
  </div>;
}
