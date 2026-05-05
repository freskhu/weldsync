"use client";

import { useEffect } from "react";
import type { Piece } from "@/lib/types";

interface PieceDetailSheetProps {
  piece: Piece;
  projectName: string;
  projectColor: string;
  robotName: string | null;
  changedByName: string | null;
  onClose: () => void;
}

/**
 * Full-screen detail sheet for a piece. Triggered by tapping the body of
 * a compact piece card on mobile. The compact card hides material, weight,
 * description, metadata pills etc. so the operator can see 4 columns in
 * parallel — this sheet brings all of that information back when needed.
 *
 * Renders as a fixed-position overlay (slide-up from bottom on mobile,
 * centered card on tablet/desktop). All read-only — no actions; the
 * operator returns to the kanban to drag, reorder, delete.
 */
export function PieceDetailSheet({
  piece,
  projectName,
  projectColor,
  robotName,
  changedByName,
  onClose,
}: PieceDetailSheetProps) {
  // Close on Escape — keyboard parity with the existing modals.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("pt-PT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const formatPeriod = (p: string | null) =>
    p === "morning" ? "Manhã" : p === "afternoon" ? "Tarde" : null;

  const plannedRange = (() => {
    if (!piece.planned_start_date && !piece.planned_end_date) return null;
    const start = formatDate(piece.planned_start_date);
    const end = formatDate(piece.planned_end_date);
    const sp = formatPeriod(piece.planned_start_period);
    const ep = formatPeriod(piece.planned_end_period);
    if (start === end) {
      // Same day — collapse to a single date with optional period.
      const periodSuffix = sp && ep && sp === ep ? ` (${sp})` : "";
      return `${start}${periodSuffix}`;
    }
    return `${start}${sp ? ` (${sp})` : ""} → ${end}${ep ? ` (${ep})` : ""}`;
  })();

  const auditTimestamp =
    piece.last_status_change_at ?? piece.updated_at ?? null;

  const statusLabel: Record<string, string> = {
    backlog: "Backlog",
    planned: "Planeada",
    programmed: "Programada",
    welding: "Em Curso",
    done: "Concluída",
    manual_weld: "Soldar à mão",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="piece-detail-title"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:w-[95vw] md:max-w-lg md:mx-4 max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — colored bar by project */}
        <div
          className="h-2 rounded-t-2xl"
          style={{ backgroundColor: projectColor }}
        />
        <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="piece-detail-title"
              className="text-lg font-bold font-mono tracking-tight text-zinc-900 truncate"
            >
              {piece.reference}
              {piece.urgent && (
                <span className="ml-2 inline-flex items-center text-[11px] font-semibold text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-full px-2 py-0.5 align-middle">
                  Urgente
                </span>
              )}
            </h2>
            <p className="text-sm text-zinc-600 mt-0.5 truncate">
              {projectName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Description */}
          {piece.description && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Descrição
              </h3>
              <p className="text-sm text-zinc-900 whitespace-pre-wrap break-words">
                {piece.description}
              </p>
            </section>
          )}

          {/* Two-column grid of fields */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Estado" value={statusLabel[piece.status] ?? piece.status} />
            <Field label="Robot" value={robotName} />
            <Field label="Material" value={piece.material} />
            <Field
              label="Peso"
              value={piece.weight_kg != null ? `${piece.weight_kg} kg` : null}
            />
            <Field
              label="Quantidade"
              value={piece.quantity > 0 ? `${piece.quantity}` : null}
            />
            <Field
              label="Horas estimadas"
              value={
                piece.estimated_hours != null ? `${piece.estimated_hours} h` : null
              }
            />
            <Field label="WPS" value={piece.wps} />
            <Field label="Programa" value={piece.program_id ? "Atribuído" : null} />
          </div>

          {/* Schedule section */}
          {(piece.scheduled_date || plannedRange) && (
            <section className="pt-3 border-t border-zinc-100 space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Agendamento
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field
                  label="Data agendada"
                  value={
                    piece.scheduled_date
                      ? `${formatDate(piece.scheduled_date)}${
                          formatPeriod(piece.scheduled_period)
                            ? ` (${formatPeriod(piece.scheduled_period)})`
                            : ""
                        }`
                      : null
                  }
                />
                <Field label="Janela planeada" value={plannedRange} />
              </div>
            </section>
          )}

          {/* Audit footer */}
          {auditTimestamp && (
            <section className="pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
              Última mudança: {changedByName ?? "—"} ·{" "}
              {formatDate(auditTimestamp)}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="text-sm text-zinc-900 truncate">{value ?? "—"}</div>
    </div>
  );
}
