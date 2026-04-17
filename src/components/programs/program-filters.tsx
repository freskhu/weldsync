"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Robot } from "@/lib/types";

interface ProgramFiltersProps {
  robots: Robot[];
  clientRefs: string[];
}

export function ProgramFilters({ robots, clientRefs }: ProgramFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") ?? "";
  const currentClient = searchParams.get("client_ref") ?? "";
  const currentRobot = searchParams.get("robot_id") ?? "";
  const currentType = searchParams.get("type") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/programs?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="flex-1">
        <input
          type="search"
          placeholder="Pesquisar por referência, cliente, notas..."
          defaultValue={currentSearch}
          onChange={(e) => updateParams("search", e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
        />
      </div>

      {/* Client filter */}
      <select
        value={currentClient}
        onChange={(e) => updateParams("client_ref", e.target.value)}
        className="px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
      >
        <option value="">Todos os clientes</option>
        {clientRefs.map((ref) => (
          <option key={ref} value={ref}>
            {ref}
          </option>
        ))}
      </select>

      {/* Robot filter */}
      <select
        value={currentRobot}
        onChange={(e) => updateParams("robot_id", e.target.value)}
        className="px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
      >
        <option value="">Todos os robots</option>
        {robots.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      {/* Type filter */}
      <select
        value={currentType}
        onChange={(e) => updateParams("type", e.target.value)}
        className="px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
      >
        <option value="">Templates e específicos</option>
        <option value="template">Apenas templates</option>
        <option value="specific">Apenas específicos</option>
      </select>

      {isPending && (
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
