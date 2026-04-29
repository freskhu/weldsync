import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

type SearchParams = Promise<{ next?: string; error?: string }>;

export const metadata = {
  title: "Entrar — WeldSync",
};

/**
 * Login page.
 *
 * Server Component:
 *   - If already authenticated, bounce to `next` or `/`.
 *   - Otherwise render the (client) `LoginForm`.
 *
 * Sign-ups are disabled at the Supabase project level. New users are added
 * by Simao via the Supabase Dashboard.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = params.next ?? "/";
  const error = params.error;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--color-surface-bg)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #0073EA, #A25DDC)",
              boxShadow: "0 4px 14px rgba(0,115,234,0.35)",
            }}
          >
            <svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">WeldSync</h1>
          <p className="text-sm text-slate-500">Curval Metalworks</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Entrar</h2>
          <p className="text-sm text-slate-500 mb-6">
            Acesso restrito ao pessoal da Curval.
          </p>

          <LoginForm next={next} initialError={error ?? null} />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Problemas a entrar? Contacta o administrador.
        </p>
      </div>
    </div>
  );
}
