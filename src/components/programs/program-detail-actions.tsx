"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditProgramForm } from "./edit-program-form";
import { DeleteProgramButton } from "./delete-program-button";
import type { Program, Robot } from "@/lib/types";

interface ProgramDetailActionsProps {
  program: Program;
  robots: Robot[];
  templates: Program[];
}

export function ProgramDetailActions({
  program,
  robots,
  templates,
}: ProgramDetailActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="px-4 py-2.5 text-sm font-medium text-zinc-900 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px]"
        >
          Editar
        </button>
        <DeleteProgramButton
          programId={program.id}
          programName={program.piece_reference}
        />
      </div>

      {showEdit && (
        <EditProgramForm
          program={program}
          robots={robots}
          templates={templates}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
