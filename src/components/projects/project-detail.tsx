"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project, Piece } from "@/lib/types";
import { Modal } from "./project-modal";
import { ProjectForm } from "./project-form";
import { ArchiveButton } from "./archive-button";
import { PieceTable } from "@/components/pieces/piece-table";
import { updateProjectAction } from "@/app/actions/project-actions";

interface ProjectDetailProps {
  project: Project;
  pieces: Piece[];
}

export function ProjectDetail({ project, pieces }: ProjectDetailProps) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/projects"
            className="text-sm text-zinc-400 hover:text-zinc-600 min-h-[44px] flex items-center"
          >
            Projetos
          </Link>
          <span className="text-sm text-zinc-300">/</span>
          <span className="text-sm text-zinc-600">{project.client_ref}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{project.name}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                {project.client_name} &middot; {project.client_ref}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 min-h-[44px]"
            >
              Editar
            </button>
            <ArchiveButton projectId={project.id} projectName={project.name} />
          </div>
        </div>
      </div>

      {/* Project info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Prazo</p>
          <p className="text-lg font-semibold text-zinc-900 mt-1">
            {project.deadline
              ? new Date(project.deadline).toLocaleDateString("pt-PT")
              : "Sem prazo"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Pecas</p>
          <p className="text-lg font-semibold text-zinc-900 mt-1">{pieces.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Peso Total</p>
          <p className="text-lg font-semibold text-zinc-900 mt-1">
            {pieces.reduce((sum, p) => sum + (p.weight_kg ?? 0) * p.quantity, 0).toLocaleString("pt-PT")} kg
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Horas Est.</p>
          <p className="text-lg font-semibold text-zinc-900 mt-1">
            {pieces.reduce((sum, p) => sum + (p.estimated_hours ?? 0) * p.quantity, 0).toLocaleString("pt-PT")}h
          </p>
        </div>
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Notas</p>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      {/* Pieces */}
      <PieceTable pieces={pieces} projectId={project.id} clientRef={project.client_ref} />

      {/* Edit Project Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Projeto">
        <ProjectForm
          action={updateProjectAction}
          project={project}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  );
}
