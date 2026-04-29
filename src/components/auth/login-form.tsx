"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  next: string;
  initialError: string | null;
}

/**
 * Login form — Microsoft OAuth + email/password.
 *
 * Sign-ups disabled. Forgot-password not in MVP.
 */
export function LoginForm({ next, initialError }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();
  const [oauthPending, setOauthPending] = useState(false);

  async function handleMicrosoft() {
    setError(null);
    setOauthPending(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
        next
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo,
          scopes: "openid profile email",
        },
      });
      if (error) {
        setError(error.message);
        setOauthPending(false);
      }
      // On success the browser is redirected to Microsoft.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar OAuth.");
      setOauthPending(false);
    }
  }

  function handleEmailPassword(formData: FormData) {
    const emailVal = String(formData.get("email") ?? "").trim();
    const passwordVal = String(formData.get("password") ?? "");
    if (!emailVal || !passwordVal) {
      setError("Preenche email e password.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: emailVal,
        password: passwordVal,
      });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Credenciais incorrectas."
            : error.message
        );
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  const busy = pending || oauthPending;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleMicrosoft}
        disabled={busy}
        className="w-full min-h-[48px] flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors touch-manipulation"
      >
        <MicrosoftLogo />
        <span>Continuar com Microsoft</span>
      </button>

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 uppercase tracking-wide">ou</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <form
        action={handleEmailPassword}
        className="flex flex-col gap-3"
        noValidate
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073EA] focus:border-transparent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073EA] focus:border-transparent"
          />
        </label>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-[48px] flex items-center justify-center rounded-lg font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed transition-opacity touch-manipulation"
          style={{
            background: "linear-gradient(135deg, #0073EA, #A25DDC)",
            boxShadow: "0 2px 6px rgba(0,115,234,0.35)",
          }}
        >
          {pending ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
