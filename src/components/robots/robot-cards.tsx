"use client";

import { useState, useTransition } from "react";
import type { Robot } from "@/lib/types";
import { deleteRobotAction } from "@/app/actions/robot-actions";
import { RobotForm } from "./robot-form";

interface AllocatedPiece {
  reference: string;
  description: string | null;
  scheduled_date: string | null;
  weight_kg: number | null;
}

interface RobotCardsProps {
  robots: Robot[];
  allocations: Record<number, AllocatedPiece[]>;
}

export function RobotCards({ robots, allocations }: RobotCardsProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(robotId: number) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteRobotAction(robotId);
      if (result?.error) {
        setDeleteError(result.error);
        setTimeout(() => setDeleteError(null), 5000);
      }
      setDeletingId(null);
    });
  }

  return (
    <>
      {/* Header with add button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-ink)' }}>Robots</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white min-h-[44px] transition hover:opacity-90"
          style={{ background: 'var(--color-brand)' }}
        >
          + Novo Robot
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {deleteError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {robots.map((robot) => {
          const pieces = allocations[robot.id] ?? [];
          const isExpanded = expandedId === robot.id;
          const isConfirmingDelete = deletingId === robot.id;

          return (
            <div
              key={robot.id}
              className="bg-white rounded-xl shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold truncate" style={{ color: 'var(--color-ink)' }}>
                      {robot.name}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                      {robot.description || `${robot.setup_type}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <span
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                        pieces.length > 0
                          ? "pill-robot"
                          : ""
                      }`}
                      style={pieces.length === 0 ? { background: 'var(--color-line-soft)', color: 'var(--color-ink-mute)' } : undefined}
                    >
                      {pieces.length} peça{pieces.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Capacity */}
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
                    {robot.capacity_kg >= 1000 ? `${robot.capacity_kg / 1000}t` : `${robot.capacity_kg} kg`}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-ink-mute)' }}>capacidade</span>
                </div>

                {/* Capabilities */}
                {robot.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {robot.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] rounded-full px-2.5 py-0.5 font-medium"
                        style={{ background: '#EEF1FA', color: '#4F5BA3' }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-line-soft)' }}>
                  <button
                    type="button"
                    onClick={() => setEditingRobot(robot)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg min-h-[36px] transition hover:bg-gray-50"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    Editar
                  </button>
                  {!isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeletingId(robot.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg min-h-[36px] transition hover:bg-red-50"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Eliminar
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-danger)' }}>Confirmar?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(robot.id)}
                        disabled={isPending}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white min-h-[32px] transition disabled:opacity-50"
                        style={{ background: 'var(--color-danger)' }}
                      >
                        {isPending ? "..." : "Sim"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg min-h-[32px] transition hover:bg-gray-100"
                        style={{ color: 'var(--color-ink-soft)' }}
                      >
                        Não
                      </button>
                    </div>
                  )}

                  {/* Expand pieces */}
                  {pieces.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : robot.id)}
                      className="ml-auto text-xs font-medium min-h-[36px] flex items-center transition"
                      style={{ color: 'var(--color-brand)' }}
                    >
                      {isExpanded ? "Esconder" : `${pieces.length} peça${pieces.length !== 1 ? "s" : ""} →`}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded piece list */}
              {isExpanded && pieces.length > 0 && (
                <div className="px-4 py-3 space-y-2 border-t" style={{ borderColor: 'var(--color-line-soft)' }}>
                  {pieces.map((piece) => (
                    <div
                      key={piece.reference}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold font-mono" style={{ color: 'var(--color-ink)' }}>
                          {piece.reference}
                        </span>
                        {piece.description && (
                          <span className="ml-1.5" style={{ color: 'var(--color-ink-soft)' }}>
                            {piece.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {piece.weight_kg != null && (
                          <span style={{ color: 'var(--color-ink-mute)' }}>
                            {piece.weight_kg} kg
                          </span>
                        )}
                        {piece.scheduled_date && (
                          <span style={{ color: 'var(--color-ink-soft)' }}>
                            {new Date(piece.scheduled_date).toLocaleDateString(
                              "pt-PT",
                              { day: "2-digit", month: "short" }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      {showCreate && <RobotForm onClose={() => setShowCreate(false)} />}

      {/* Edit modal */}
      {editingRobot && <RobotForm robot={editingRobot} onClose={() => setEditingRobot(null)} />}
    </>
  );
}
