"use client";

import { useState, useTransition } from "react";
import type { Robot, Piece } from "@/lib/types";
import { programPieceWithRobotAction } from "@/app/actions/piece-actions";

interface RobotPickerModalProps {
  piece: Piece;
  robots: Robot[];
  /** Initial robot_id to preselect (e.g. piece.robot_id when re-programming). */
  initialRobotId?: number | null;
  onConfirm: (robotId: number) => void;
  onCancel: () => void;
}

/**
 * Modal shown when a piece is dropped into the "Programada" column.
 * Asks the user which robot was programmed. Persists status + robot_id
 * atomically via programPieceWithRobotAction. Does not touch dates.
 */
export function RobotPickerModal({
  piece,
  robots,
  initialRobotId,
  onConfirm,
  onCancel,
}: RobotPickerModalProps) {
  const [selectedRobot, setSelectedRobot] = useState<number | null>(
    initialRobotId ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!selectedRobot) return;
    setError(null);
    startTransition(async () => {
      const result = await programPieceWithRobotAction(piece.id, selectedRobot);
      if (result.success) {
        onConfirm(selectedRobot);
      } else {
        setError(result.error ?? "Erro ao programar peça.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            Programar — {piece.reference}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {piece.description ?? "Sem descrição"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Em que robot foi programada esta peça?
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          {robots.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum robot disponível.</p>
          ) : (
            <div className="space-y-2">
              {robots.map((robot) => {
                const isSelected = selectedRobot === robot.id;
                return (
                  <button
                    key={robot.id}
                    type="button"
                    onClick={() => setSelectedRobot(robot.id)}
                    className={`w-full text-left rounded-lg border p-3 min-h-[44px] transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-900">
                        {robot.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {robot.setup_type}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {robot.capacity_kg} kg
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 min-h-[44px] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedRobot || isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors"
          >
            {isPending ? "A programar..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
