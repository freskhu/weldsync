"use client";

import { useActionState, useState, useTransition } from "react";
import type { Piece } from "@/lib/types";
import type { ActionResult } from "@/app/actions/piece-actions";
import { linkProgramToPiece, unlinkProgramFromPiece } from "@/app/actions/piece-actions";
import { ProgramSuggestions } from "./program-suggestions";

interface PieceFormProps {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  projectId: string;
  piece?: Piece;
  clientRef?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function PieceForm({ action, projectId, piece, clientRef, onCancel, onSuccess }: PieceFormProps) {
  const [state, formAction, isPending] = useActionState(async (prev: ActionResult | null, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success && onSuccess) {
      onSuccess();
    }
    return result;
  }, null);

  const [urgent, setUrgent] = useState(piece?.urgent ?? false);
  const [reference, setReference] = useState(piece?.reference ?? "");
  const [linkedProgramId, setLinkedProgramId] = useState<string | null>(piece?.program_id ?? null);
  const [, startTransition] = useTransition();

  const handleLinkProgram = (programId: string) => {
    if (!piece) {
      // For new pieces, just set the local state — will be saved with the form
      setLinkedProgramId(programId);
      return;
    }
    startTransition(async () => {
      const result = await linkProgramToPiece(piece.id, programId);
      if (result.success) {
        setLinkedProgramId(programId);
      }
    });
  };

  const handleUnlinkProgram = () => {
    if (!piece) {
      setLinkedProgramId(null);
      return;
    }
    startTransition(async () => {
      const result = await unlinkProgramFromPiece(piece.id);
      if (result.success) {
        setLinkedProgramId(null);
      }
    });
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {piece && <input type="hidden" name="id" value={piece.id} />}

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reference */}
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-zinc-700 mb-1">
            Referencia *
          </label>
          <input
            id="reference"
            name="reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="VIG-01"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
          {state?.fieldErrors?.reference && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.reference[0]}</p>
          )}
        </div>

        {/* Material */}
        <div>
          <label htmlFor="material" className="block text-sm font-medium text-zinc-700 mb-1">
            Material
          </label>
          <input
            id="material"
            name="material"
            type="text"
            defaultValue={piece?.material ?? ""}
            placeholder="S355JR"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 mb-1">
            Descricao
          </label>
          <input
            id="description"
            name="description"
            type="text"
            defaultValue={piece?.description ?? ""}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* WPS */}
        <div>
          <label htmlFor="wps" className="block text-sm font-medium text-zinc-700 mb-1">
            WPS
          </label>
          <input
            id="wps"
            name="wps"
            type="text"
            defaultValue={piece?.wps ?? ""}
            placeholder="WPS-001"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Barcode */}
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-zinc-700 mb-1">
            Codigo de Barras
          </label>
          <input
            id="barcode"
            name="barcode"
            type="text"
            defaultValue={piece?.barcode ?? ""}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-zinc-700 mb-1">
            Quantidade *
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            defaultValue={piece?.quantity ?? 1}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
          {state?.fieldErrors?.quantity && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.quantity[0]}</p>
          )}
        </div>

        {/* Weight */}
        <div>
          <label htmlFor="weight_kg" className="block text-sm font-medium text-zinc-700 mb-1">
            Peso (kg)
          </label>
          <input
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={0}
            step={0.1}
            defaultValue={piece?.weight_kg ?? ""}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Estimated Hours */}
        <div>
          <label htmlFor="estimated_hours" className="block text-sm font-medium text-zinc-700 mb-1">
            Horas Estimadas
          </label>
          <input
            id="estimated_hours"
            name="estimated_hours"
            type="number"
            min={0}
            step={0.5}
            defaultValue={piece?.estimated_hours ?? ""}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Urgent Toggle */}
        <div className="flex items-center gap-3 min-h-[44px]">
          <label htmlFor="urgent" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="urgent"
              name="urgent"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            <span className="ml-3 text-sm font-medium text-zinc-700">Urgente</span>
          </label>
        </div>
      </div>

      {/* Program Suggestions */}
      <ProgramSuggestions
        pieceReference={reference}
        clientRef={clientRef}
        linkedProgramId={linkedProgramId}
        onSelect={handleLinkProgram}
        onUnlink={handleUnlinkProgram}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 min-h-[44px]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 min-h-[44px]"
        >
          {isPending ? "A guardar..." : piece ? "Guardar" : "Criar Peca"}
        </button>
      </div>
    </form>
  );
}
