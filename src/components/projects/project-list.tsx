"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import { Modal } from "./project-modal";
import { ProjectForm } from "./project-form";
import { createProjectAction } from "@/app/actions/project-actions";

interface ProjectListProps {
  projects: Project[];
  pieceCounts: Record<string, number>;
}

export function ProjectList({ projects, pieceCounts }: ProjectListProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Projetos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {projects.length} projeto{projects.length !== 1 ? "s" : ""} ativo{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 min-h-[44px]"
        >
          + Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium">Sem projetos</p>
          <p className="text-sm mt-1">Cria o primeiro projeto para comecar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-10"></th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Ref.</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Projeto</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Cliente</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Prazo</th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Pecas</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-mono text-zinc-600 hover:text-zinc-900"
                    >
                      {project.client_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-medium text-zinc-900 hover:text-blue-600"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-zinc-600">{project.client_name}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-zinc-600">
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString("pt-PT")
                        : "--"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-zinc-500 tabular-nums">
                      {pieceCounts[project.id] ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo Projeto">
        <ProjectForm action={createProjectAction} onCancel={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}
