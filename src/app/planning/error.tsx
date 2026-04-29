"use client";

import { useEffect } from "react";

/**
 * Temporary error boundary for /planning while we diagnose the
 * post-mutation re-render failure (drag Backlog→Planeados breaks).
 * Surfaces the real error message and digest so we can correlate with
 * Vercel function logs.
 */
export default function PlanningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[planning/error.tsx] caught:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-red-700 mb-2">
        Erro na página Programação
      </h1>
      <p className="text-sm text-zinc-700 mb-4">
        Algo correu mal a renderizar. Mensagem técnica abaixo.
      </p>
      <pre className="bg-zinc-100 border border-zinc-300 rounded p-3 text-xs whitespace-pre-wrap break-all text-zinc-900">
        {error.message || "(sem mensagem)"}
        {error.digest ? `\n\ndigest: ${error.digest}` : ""}
      </pre>
      <button
        onClick={reset}
        className="mt-4 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        Tentar novamente
      </button>
    </div>
  );
}
