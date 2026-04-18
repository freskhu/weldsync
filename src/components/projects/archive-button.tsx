"use client";

import { useState, useTransition } from "react";
import { archiveProjectAction } from "@/app/actions/project-actions";
import { useRouter } from "next/navigation";

interface ArchiveButtonProps {
  projectId: string;
  projectName: string;
}

export function ArchiveButton({ projectId, projectName }: ArchiveButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleArchive = () => {
    const formData = new FormData();
    formData.set("id", projectId);

    startTransition(async () => {
      await archiveProjectAction(formData);
      router.push("/projects");
      router.refresh();
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">Arquivar &quot;{projectName}&quot;?</span>
        <button
          type="button"
          onClick={handleArchive}
          disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--color-danger)] rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-150 min-h-[44px]"
        >
          {isPending ? "..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-all duration-150 min-h-[44px]"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 min-h-[44px]"
    >
      Arquivar
    </button>
  );
}
