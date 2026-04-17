"use client";

import { useActionState, useState } from "react";
import { updateProgramAction, type ActionState } from "@/app/programs/actions";
import type { Program, Robot } from "@/lib/types";

interface EditProgramFormProps {
  program: Program;
  robots: Robot[];
  templates: Program[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProgramForm({
  program,
  robots,
  templates,
  onClose,
  onSuccess,
}: EditProgramFormProps) {
  const boundAction = updateProgramAction.bind(null, program.id);
  const [state, formAction, isPending] = useActionState(
    async (_prevState: ActionState | null, formData: FormData) => {
      const result = await boundAction(null, formData);
      if (result.success) onSuccess();
      return result;
    },
    null
  );
  const [isTemplate, setIsTemplate] = useState(program.is_template);

  // Filter templates: exclude self and non-templates
  const availableTemplates = templates.filter(
    (t) => t.id !== program.id && t.is_template
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Editar Programa</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="p-5 space-y-4">
          {state?.error && !state.success && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {state.error}
            </div>
          )}

          {/* File info (read-only) */}
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
            <p className="text-xs text-zinc-500">Ficheiro</p>
            <p className="text-sm font-medium text-zinc-900">{program.file_name}</p>
          </div>

          {/* Piece reference */}
          <div>
            <label htmlFor="piece_reference" className="block text-sm font-medium text-zinc-700 mb-1">
              Referência da peça *
            </label>
            <input
              id="piece_reference"
              name="piece_reference"
              type="text"
              required
              defaultValue={program.piece_reference}
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            />
            <FieldErrors errors={state?.fieldErrors?.piece_reference} />
          </div>

          {/* Client ref */}
          <div>
            <label htmlFor="client_ref" className="block text-sm font-medium text-zinc-700 mb-1">
              Referência do cliente
            </label>
            <input
              id="client_ref"
              name="client_ref"
              type="text"
              defaultValue={program.client_ref ?? ""}
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            />
          </div>

          {/* Robot */}
          <div>
            <label htmlFor="robot_id" className="block text-sm font-medium text-zinc-700 mb-1">
              Robot
            </label>
            <select
              id="robot_id"
              name="robot_id"
              defaultValue={program.robot_id ?? ""}
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            >
              <option value="">Selecionar robot...</option>
              {robots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Is template */}
          <div className="flex items-center gap-3">
            <input
              id="is_template"
              name="is_template"
              type="checkbox"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <label htmlFor="is_template" className="text-sm font-medium text-zinc-700">
              Este programa é um template
            </label>
          </div>

          {/* Template selector */}
          {!isTemplate && availableTemplates.length > 0 && (
            <div>
              <label htmlFor="template_id" className="block text-sm font-medium text-zinc-700 mb-1">
                Baseado no template
              </label>
              <select
                id="template_id"
                name="template_id"
                defaultValue={program.template_id ?? ""}
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
              >
                <option value="">Nenhum template</option>
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.piece_reference} ({t.file_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* WPS */}
          <div>
            <label htmlFor="wps" className="block text-sm font-medium text-zinc-700 mb-1">
              WPS
            </label>
            <input
              id="wps"
              name="wps"
              type="text"
              defaultValue={program.wps ?? ""}
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            />
          </div>

          {/* Execution time */}
          <div>
            <label htmlFor="execution_time_min" className="block text-sm font-medium text-zinc-700 mb-1">
              Tempo de execução (min)
            </label>
            <input
              id="execution_time_min"
              name="execution_time_min"
              type="number"
              min="1"
              defaultValue={program.execution_time_min ?? ""}
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            />
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
              defaultValue={program.notes ?? ""}
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isPending ? "A guardar..." : "Guardar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div className="mt-1">
      {errors.map((e, i) => (
        <p key={i} className="text-xs text-red-600">{e}</p>
      ))}
    </div>
  );
}
