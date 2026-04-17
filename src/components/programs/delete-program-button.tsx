"use client";

import { useState, useTransition } from "react";
import { deleteProgramAction } from "@/app/programs/actions";

interface DeleteProgramButtonProps {
  programId: string;
  programName: string;
}

export function DeleteProgramButton({ programId, programName }: DeleteProgramButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteProgramAction(programId);
    });
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors min-h-[44px]"
      >
        Eliminar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-700 flex-1">
        Eliminar <strong>{programName}</strong>? Esta ação é irreversível.
      </p>
      <button
        type="button"
        onClick={() => setShowConfirm(false)}
        disabled={isPending}
        className="px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px]"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 min-h-[44px]"
      >
        {isPending ? "A eliminar..." : "Confirmar"}
      </button>
    </div>
  );
}
