"use client";

import { Activity } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    async function exchange() {
      const code = params.get("code");
      const state = params.get("state");
      const expectedState = sessionStorage.getItem("oidc_state");
      const verifier = sessionStorage.getItem("oidc_verifier");
      if (!code || !state || state !== expectedState || !verifier) {
        setError("The authorization response could not be verified.");
        return;
      }
      const response = await fetch("/api/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, verifier, redirectUri: `${location.origin}/auth/callback` }),
      });
      sessionStorage.removeItem("oidc_state");
      sessionStorage.removeItem("oidc_verifier");
      if (!response.ok) {
        setError("Sign-in could not be completed. Please try again.");
        return;
      }
      router.replace("/");
    }
    void exchange();
  }, [params, router]);
  return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><Activity className="mx-auto size-8 animate-pulse text-primary" /><h1 className="mt-4 text-lg font-semibold">{error || "Verifying secure session…"}</h1>{error && <a href="/login" className="mt-3 inline-block text-sm text-primary hover:underline">Return to sign in</a>}</div></main>;
}

export default function AuthCallback() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center">Preparing secure session…</main>}><AuthCallbackContent /></Suspense>;
}
