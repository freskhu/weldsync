"use client";

import { useActionState, useState } from "react";
import { ColorPicker } from "./color-picker";
import type { Project } from "@/lib/types";
import type { ActionResult } from "@/app/actions/project-actions";

interface ProjectFormProps {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  project?: Project;
  onCancel: () => void;
}

export function ProjectForm({ action, project, onCancel }: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [color, setColor] = useState(project?.color ?? "#3B82F6");

  return (
    <form action={formAction} className="space-y-5">
      {project && <input type="hidden" name="id" value={project.id} />}

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Ref */}
        <div>
          <label htmlFor="client_ref" className="block text-sm font-medium text-zinc-700 mb-1">
            Ref. Cliente *
          </label>
          <input
            id="client_ref"
            name="client_ref"
            type="text"
            defaultValue={project?.client_ref ?? ""}
            placeholder="CRV-2024-XXX"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-400)] min-h-[44px]"
          />
          {state?.fieldErrors?.client_ref && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.client_ref[0]}</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
            Nome do Projeto *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={project?.name ?? ""}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-400)] min-h-[44px]"
          />
          {state?.fieldErrors?.name && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        {/* Client Name */}
        <div>
          <label htmlFor="client_name" className="block text-sm font-medium text-zinc-700 mb-1">
            Cliente *
          </label>
          <input
            id="client_name"
            name="client_name"
            type="text"
            defaultValue={project?.client_name ?? ""}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-400)] min-h-[44px]"
          />
          {state?.fieldErrors?.client_name && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.client_name[0]}</p>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-zinc-700 mb-1">
            Prazo
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={project?.deadline ?? ""}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-400)] min-h-[44px]"
          />
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Cor do Projeto</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 mb-1">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={project?.notes ?? ""}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:border-[var(--color-brand-400)] resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-150 min-h-[44px]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-brand-600)] rounded-xl hover:bg-[var(--color-brand-700)] shadow-[var(--shadow-sm)] disabled:opacity-50 transition-all duration-150 min-h-[44px]"
        >
          {isPending ? "A guardar..." : project ? "Guardar" : "Criar Projeto"}
        </button>
      </div>
    </form>
  );
}
