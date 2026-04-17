"use client";

import { useActionState, useState, useRef } from "react";
import { uploadProgramAction, type ActionState } from "@/app/programs/actions";
import type { Program, Robot } from "@/lib/types";
import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB } from "@/lib/validations/program";

interface UploadProgramFormProps {
  robots: Robot[];
  templates: Program[];
  onClose: () => void;
}

export function UploadProgramForm({ robots, templates, onClose }: UploadProgramFormProps) {
  const [state, formAction, isPending] = useActionState(uploadProgramAction, null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);

    if (file) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (ext !== ".tp" && ext !== ".ls") {
        setFileError("Apenas ficheiros .tp e .ls são aceites");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setFileError(`Ficheiro demasiado grande (máximo ${MAX_FILE_SIZE_MB}MB)`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Novo Programa</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="p-5 space-y-4">
          {/* Error banner */}
          {state?.error && !state.success && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {state.error}
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Ficheiro do programa *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept={ACCEPTED_FILE_EXTENSIONS.map((e) => e).join(",")}
              onChange={handleFileChange}
              className="w-full text-sm text-zinc-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-zinc-300 file:bg-zinc-50 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-100 file:cursor-pointer min-h-[44px]"
            />
            {fileError && (
              <p className="mt-1 text-xs text-red-600">{fileError}</p>
            )}
            {selectedFile && (
              <p className="mt-1 text-xs text-zinc-500">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <FieldErrors errors={state?.fieldErrors?.file_name} />
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
              placeholder="ex: CURV-2025-001"
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
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
              placeholder="ex: CLI-TEKEVER-001"
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            />
            <FieldErrors errors={state?.fieldErrors?.client_ref} />
          </div>

          {/* Robot selector */}
          <div>
            <label htmlFor="robot_id" className="block text-sm font-medium text-zinc-700 mb-1">
              Robot
            </label>
            <select
              id="robot_id"
              name="robot_id"
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            >
              <option value="">Selecionar robot...</option>
              {robots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <FieldErrors errors={state?.fieldErrors?.robot_id} />
          </div>

          {/* Is template toggle */}
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

          {/* Template selector (only if NOT a template) */}
          {!isTemplate && templates.length > 0 && (
            <div>
              <label htmlFor="template_id" className="block text-sm font-medium text-zinc-700 mb-1">
                Baseado no template
              </label>
              <select
                id="template_id"
                name="template_id"
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
              >
                <option value="">Nenhum template</option>
                {templates.map((t) => (
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
              placeholder="ex: WPS-135-MAG"
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            />
            <FieldErrors errors={state?.fieldErrors?.wps} />
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
              placeholder="ex: 45"
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent min-h-[44px]"
            />
            <FieldErrors errors={state?.fieldErrors?.execution_time_min} />
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
              placeholder="Notas opcionais sobre o programa..."
              className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
            />
            <FieldErrors errors={state?.fieldErrors?.notes} />
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
              disabled={isPending || !!fileError}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isPending ? "A carregar..." : "Criar Programa"}
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
