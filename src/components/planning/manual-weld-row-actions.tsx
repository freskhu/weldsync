"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Piece, Robot } from "@/lib/types";
import { RobotPickerModal } from "@/components/planning/robot-picker-modal";
import {
  revertManualWeldToPlannedAction,
  revertManualWeldToProgrammedAction,
} from "@/app/actions/piece-actions";

interface ManualWeldRowActionsProps {
  piece: Piece;
  robots: Robot[];
}

/**
 * Inline action buttons for a manual_weld row. Two paths:
 *
 *   - "→ Planeados": one-tap revert; piece goes back to the planning column
 *     with no robot. Calls revertManualWeldToPlannedAction.
 *   - "→ Programada": opens the shared RobotPickerModal so the operator can
 *     pick which robot the piece is programmed on. Calls
 *     revertManualWeldToProgrammedAction(robotId).
 *
 * Both paths refresh the route on success — the page is a Server Component
 * and the action calls revalidatePath, so router.refresh() is enough to
 * re-pull the manual-weld list (the row will simply disappear from this view).
 */
export function ManualWeldRowActions({
  piece,
  robots,
}: ManualWeldRowActionsProps) {
  const router = useRouter();
  const [showRobotPicker, setShowRobotPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevertToPlanned() {
    setError(null);
    startTransition(async () => {
      const result = await revertManualWeldToPlannedAction(piece.id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Erro ao reverter peça.");
      }
    });
  }

  function handleConfirmRobot() {
    // Modal already invoked the action and got success. Just close + refresh.
    setShowRobotPicker(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center shrink-0">
        <button
          type="button"
          onClick={handleRevertToPlanned}
          disabled={isPending}
          className="px-3 py-2 min-h-[44px] text-[13px] font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          aria-label={`Voltar ${piece.reference} para Planeados`}
        >
          {isPending ? "A reverter..." : "→ Planeados"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowRobotPicker(true);
          }}
          disabled={isPending}
          className="px-3 py-2 min-h-[44px] text-[13px] font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          aria-label={`Voltar ${piece.reference} para Programada`}
        >
          → Programada
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="text-[12px] text-red-600 mt-1 sm:mt-0 sm:ml-2"
        >
          {error}
        </p>
      )}

      {showRobotPicker && (
        <RobotPickerModal
          piece={piece}
          robots={robots}
          initialRobotId={piece.robot_id}
          submitAction={revertManualWeldToProgrammedAction}
          title={`Voltar para Programada — ${piece.reference}`}
          prompt="Em que robot está programada esta peça?"
          confirmLabel="Reverter"
          pendingLabel="A reverter..."
          onConfirm={handleConfirmRobot}
          onCancel={() => setShowRobotPicker(false)}
        />
      )}
    </>
  );
}
