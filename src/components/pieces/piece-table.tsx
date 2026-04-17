"use client";

import { useState, useTransition } from "react";
import type { Piece } from "@/lib/types";
import { Modal } from "@/components/projects/project-modal";
import { PieceForm } from "./piece-form";
import { createPieceAction, updatePieceAction, deletePieceAction } from "@/app/actions/piece-actions";
import { useRouter } from "next/navigation";

interface PieceTableProps {
  pieces: Piece[];
  projectId: string;
}

export function PieceTable({ pieces, projectId }: PieceTableProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingPiece, setEditingPiece] = useState<Piece | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (pieceId: string) => {
    const formData = new FormData();
    formData.set("id", pieceId);
    formData.set("project_id", projectId);

    startTransition(async () => {
      await deletePieceAction(formData);
      setDeletingId(null);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          Pecas ({pieces.length})
        </h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 min-h-[44px]"
        >
          + Nova Peca
        </button>
      </div>

      {pieces.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 bg-white rounded-xl border border-zinc-200">
          <p className="text-sm">Sem pecas neste projeto.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Criar primeira peca
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Ref.</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Descricao</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Material</th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Qtd</th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Peso</th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Horas</th>
                <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Estado</th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((piece) => (
                <tr
                  key={piece.id}
                  className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {piece.urgent && (
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Urgente" />
                      )}
                      <span className="text-sm font-mono font-medium text-zinc-900">
                        {piece.reference}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-zinc-600 truncate max-w-[200px] block">
                      {piece.description || "--"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-zinc-600">{piece.material || "--"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-zinc-700 tabular-nums">{piece.quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-zinc-600 tabular-nums">
                      {piece.weight_kg ? `${piece.weight_kg} kg` : "--"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-zinc-600 tabular-nums">
                      {piece.estimated_hours ? `${piece.estimated_hours}h` : "--"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      piece.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : piece.status === "in_production"
                        ? "bg-blue-100 text-blue-700"
                        : piece.status === "allocated"
                        ? "bg-yellow-100 text-yellow-700"
                        : piece.status === "programmed"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {piece.status === "backlog" && "Backlog"}
                      {piece.status === "programmed" && "Programada"}
                      {piece.status === "allocated" && "Alocada"}
                      {piece.status === "in_production" && "Em Producao"}
                      {piece.status === "completed" && "Concluida"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingPiece(piece)}
                        className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {deletingId === piece.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(piece.id)}
                            disabled={isPending}
                            className="p-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-medium"
                          >
                            {isPending ? "..." : "Sim"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="p-2 text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-medium"
                          >
                            Nao
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(piece.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Piece Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nova Peca">
        <PieceForm
          action={createPieceAction}
          projectId={projectId}
          onCancel={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      </Modal>

      {/* Edit Piece Modal */}
      <Modal
        open={editingPiece !== null}
        onClose={() => setEditingPiece(null)}
        title="Editar Peca"
      >
        {editingPiece && (
          <PieceForm
            action={updatePieceAction}
            projectId={projectId}
            piece={editingPiece}
            onCancel={() => setEditingPiece(null)}
            onSuccess={() => {
              setEditingPiece(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
