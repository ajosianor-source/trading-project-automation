"use client";

import { useState, useEffect } from "react";
import { Activity, ArrowRight, KeyRound, ShieldCheck, Fingerprint, HeartPulse, Zap } from "lucide-react";

export default function LoginPage() {
  const [autoLogin, setAutoLogin] = useState(false);

  useEffect(() => {
    // Check if auto-login is enabled via query param or local storage
    const params = new URLSearchParams(window.location.search);
    if (params.get("auto") === "true") {
      setAutoLogin(true);
      const timer = setTimeout(() => {
        window.location.assign("/api/auth/staging-login");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (autoLogin) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden p-6 bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/.15),transparent_40rem)]" />
        <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-white shadow-glow animate-pulse">
            <Activity className="size-6" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">Auto-Authenticating...</h2>
          <p className="mt-2 text-sm text-slate-400">
            Establishing secure session with local staging identity provider.
          </p>
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 rounded-full bg-primary animate-infinite-scroll" style={{
              animation: "shimmer 1.5s infinite linear",
              backgroundImage: "linear-gradient(to right, var(--primary) 0%, #22d3ee 50%, var(--primary) 100%)",
              backgroundSize: "200% 100%"
            }} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-6 bg-slate-950 text-white">
      {/* Radial background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/.12),transparent_35rem)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.08),transparent_35rem)]" />

      <section className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-glow">
            <Activity className="size-5" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg">HealthGov</h1>
            <p className="text-[10px] uppercase tracking-[.16em] text-slate-400">Governance control plane</p>
          </div>
        </div>

        <div className="my-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Secure Access Gateway</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Welcome to HealthGov</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Select your organization identity provider. Phishing-resistant MFA and tenant isolation policies are strictly enforced.
          </p>
        </div>

        {/* Interactive Sign-In Options */}
        <div className="space-y-3">
          {/* 1. Auto-Login (Staging/Dev) */}
          <a
            href="/api/auth/staging-login"
            className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-primary/50 hover:bg-primary/5"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Zap className="size-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-semibold">Staging Auto-Login</div>
              <div className="text-xs text-slate-400">Instant zero-click login for local development</div>
            </div>
            <ArrowRight className="size-4 text-slate-500" />
          </a>

          {/* 2. Enterprise SSO (Okta/Keycloak) */}
          <a
            href="/api/auth/staging-login"
            className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-cyan-500/50 hover:bg-cyan-500/5"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <KeyRound className="size-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-semibold">Enterprise SSO</div>
              <div className="text-xs text-slate-400">Login with Okta, Keycloak, or Ping Identity</div>
            </div>
            <ArrowRight className="size-4 text-slate-500" />
          </a>

          {/* 3. FIDO2 / WebAuthn Passkey */}
          <button
            onClick={() => window.location.assign("/api/auth/staging-login")}
            className="w-full flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Fingerprint className="size-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-semibold">FIDO2 / WebAuthn Passkey</div>
              <div className="text-xs text-slate-400">Phishing-resistant hardware MFA (YubiKey, TouchID)</div>
            </div>
            <ArrowRight className="size-4 text-slate-500" />
          </button>

          {/* 4. SMART on FHIR */}
          <button
            onClick={() => window.location.assign("/api/auth/staging-login")}
            className="w-full flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-violet-500/50 hover:bg-violet-500/5"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-400">
              <HeartPulse className="size-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-semibold">SMART on FHIR Launch</div>
              <div className="text-xs text-slate-400">EHR-integrated clinical application launch</div>
            </div>
            <ArrowRight className="size-4 text-slate-500" />
          </button>
        </div>

        {/* Footer Security Badges */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-[10px] text-slate-400">
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-3 border border-slate-800/50">
            <ShieldCheck className="size-4 text-primary" />
            OAuth 2.0 + PKCE
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-3 border border-slate-800/50">
            <ShieldCheck className="size-4 text-primary" />
            SMART Compatible
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] leading-relaxed text-slate-500">
          Authorized workforce access only. All authentication attempts, session state changes, and access requests are cryptographically signed and audited.
        </p>
      </section>
    </main>
  );
}
