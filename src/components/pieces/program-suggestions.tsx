"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Program } from "@/lib/types";

interface SuggestedProgram extends Program {
  relevance: number;
  match_reason: string;
}

interface ProgramSuggestionsProps {
  pieceReference: string;
  clientRef?: string;
  linkedProgramId: string | null;
  onSelect: (programId: string) => void;
  onUnlink: () => void;
}

export function ProgramSuggestions({
  pieceReference,
  clientRef,
  linkedProgramId,
  onSelect,
  onUnlink,
}: ProgramSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkedProgram, setLinkedProgram] = useState<SuggestedProgram | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    async (ref: string) => {
      if (!ref || ref.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ piece_reference: ref });
        if (clientRef) params.set("client_ref", clientRef);
        const res = await fetch(`/api/programs/suggest?${params.toString()}`);
        if (res.ok) {
          const data: SuggestedProgram[] = await res.json();
          setSuggestions(data);
          // If a program is linked, find it in results or keep previous
          if (linkedProgramId) {
            const found = data.find((s) => s.id === linkedProgramId);
            setLinkedProgram(found ?? null);
          }
        }
      } catch {
        // Silently fail — suggestion is non-critical
      } finally {
        setLoading(false);
      }
    },
    [clientRef, linkedProgramId]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(pieceReference);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pieceReference, fetchSuggestions]);

  // If there's a linked program but it wasn't in suggestions, fetch all to find it
  useEffect(() => {
    if (linkedProgramId && !linkedProgram && suggestions.length > 0) {
      const found = suggestions.find((s) => s.id === linkedProgramId);
      if (found) setLinkedProgram(found);
    }
  }, [linkedProgramId, linkedProgram, suggestions]);

  const fileTypeBadge = (ft: string) => {
    const colors =
      ft === "tp"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${colors}`}
      >
        {ft}
      </span>
    );
  };

  // Linked program info
  if (linkedProgramId && linkedProgram) {
    return (
      <div className="mt-4 border border-zinc-200 rounded-lg p-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
          Programa Associado
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-4 h-4 text-green-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium text-zinc-900 truncate">
              {linkedProgram.file_name}
            </span>
            {fileTypeBadge(linkedProgram.file_type)}
            {linkedProgram.is_template && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                Template
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onUnlink}
            className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded min-h-[32px]"
          >
            Desassociar
          </button>
        </div>
      </div>
    );
  }

  // No suggestions and no input
  if (
    !pieceReference ||
    pieceReference.trim().length < 2
  ) {
    return null;
  }

  return (
    <div className="mt-4 border border-zinc-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">
          Programas Sugeridos
        </p>
        {loading && (
          <span className="text-xs text-zinc-400">A procurar...</span>
        )}
      </div>

      {!loading && suggestions.length === 0 && (
        <p className="text-sm text-zinc-400 py-2">
          Sem programas correspondentes.
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors min-h-[44px] ${
                s.id === linkedProgramId
                  ? "border-green-300 bg-green-50"
                  : "border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-mono text-zinc-900 truncate">
                    {s.piece_reference}
                  </span>
                  {fileTypeBadge(s.file_type)}
                  {s.is_template && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                      Template
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 flex-shrink-0">
                  {s.match_reason}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-zinc-500 truncate">
                  {s.file_name}
                </span>
                {s.execution_time_min && (
                  <span className="text-xs text-zinc-400 flex-shrink-0">
                    {s.execution_time_min}min
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-zinc-100">
        <a
          href="/programs"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Upload novo programa
        </a>
      </div>
    </div>
  );
}
