"use client";

import { useState, useTransition } from "react";
import type { Robot, Piece } from "@/lib/types";
import { allocatePieceAction } from "@/app/actions/piece-actions";

interface AllocationModalProps {
  piece: Piece;
  robots: Robot[];
  robotLoads: Record<number, number>;
  onConfirm: (robotId: number, date: string, period: "AM" | "PM") => void;
  onCancel: () => void;
}

export function AllocationModal({
  piece,
  robots,
  robotLoads,
  onConfirm,
  onCancel,
}: AllocationModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedRobot, setSelectedRobot] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedRobotData = robots.find((r) => r.id === selectedRobot);
  const overCapacity =
    selectedRobotData &&
    piece.weight_kg !== null &&
    piece.weight_kg > selectedRobotData.capacity_kg;

  function handleConfirm() {
    if (!selectedRobot || !date) return;

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("pieceId", piece.id);
      formData.set("robotId", String(selectedRobot));
      formData.set("date", date);
      formData.set("period", period);

      const result = await allocatePieceAction(formData);
      if (result.success) {
        onConfirm(selectedRobot, date, period);
      } else {
        setError(result.error ?? "Erro ao alocar peça.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            Alocar Peça — {piece.reference}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {piece.description ?? "Sem descrição"}
            {piece.weight_kg != null && ` · ${piece.weight_kg} kg`}
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Compatibility warning */}
          {overCapacity && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              <span className="text-lg leading-none mt-0.5">&#9888;</span>
              <span>
                Peça ({piece.weight_kg} kg) excede capacidade do Robot (
                {selectedRobotData!.capacity_kg} kg)
              </span>
            </div>
          )}

          {/* Robot selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Robot
            </label>
            <div className="space-y-2">
              {robots.map((robot) => {
                const load = robotLoads[robot.id] ?? 0;
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
                        {load} peça{load !== 1 ? "s" : ""} nesta data
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500">
                        {robot.capacity_kg} kg
                      </span>
                      <span className="text-xs text-zinc-400">·</span>
                      <span className="text-xs text-zinc-500">
                        {robot.setup_type}
                      </span>
                    </div>
                    {robot.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {robot.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="text-[10px] bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="alloc-date"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              Data
            </label>
            <input
              id="alloc-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Período
            </label>
            <div className="flex gap-3">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`flex-1 text-center rounded-lg border px-4 py-2 text-sm font-medium min-h-[44px] transition-colors ${
                    period === p
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {p === "AM" ? "Manhã" : "Tarde"}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
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
            disabled={!selectedRobot || !date || isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors"
          >
            {isPending ? "A alocar..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
