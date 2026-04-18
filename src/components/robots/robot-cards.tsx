"use client";

import { useState } from "react";
import type { Robot } from "@/lib/types";

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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {robots.map((robot) => {
        const pieces = allocations[robot.id] ?? [];
        const isExpanded = expandedId === robot.id;

        return (
          <div
            key={robot.id}
            className="bg-white rounded-xl border border-zinc-200 shadow-sm"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {robot.name}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {robot.capacity_kg} kg · {robot.setup_type}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                    pieces.length > 0
                      ? "bg-blue-50 text-blue-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {pieces.length} peça{pieces.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Capabilities */}
              {robot.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {robot.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-medium"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand toggle */}
              {pieces.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : robot.id)
                  }
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium min-h-[44px] flex items-center"
                >
                  {isExpanded ? "Esconder peças" : `Ver ${pieces.length} peça${pieces.length !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>

            {/* Expanded piece list */}
            {isExpanded && pieces.length > 0 && (
              <div className="border-t border-zinc-100 px-4 py-3 space-y-2">
                {pieces.map((piece) => (
                  <div
                    key={piece.reference}
                    className="flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-zinc-900">
                        {piece.reference}
                      </span>
                      {piece.description && (
                        <span className="text-zinc-500 ml-1.5">
                          {piece.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {piece.weight_kg != null && (
                        <span className="text-zinc-400">
                          {piece.weight_kg} kg
                        </span>
                      )}
                      {piece.scheduled_date && (
                        <span className="text-zinc-500">
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
  );
}
