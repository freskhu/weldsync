"use client";

import { useActionState } from "react";
import { createRobotAction, updateRobotAction, type RobotActionState } from "@/app/actions/robot-actions";
import type { Robot } from "@/lib/types";

interface RobotFormProps {
  robot?: Robot;
  onClose: () => void;
}

export function RobotForm({ robot, onClose }: RobotFormProps) {
  const isEdit = !!robot;
  const action = isEdit ? updateRobotAction : createRobotAction;
  const [state, formAction, isPending] = useActionState(action, null);

  if (state?.success) {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-line)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            {isEdit ? "Editar Robot" : "Novo Robot"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="p-5 space-y-4">
          {isEdit && <input type="hidden" name="id" value={robot.id} />}

          {state?.error && (
            <div className="p-3 rounded-lg text-sm font-medium" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              {state.error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink)' }}>Nome *</label>
            <input
              name="name"
              defaultValue={robot?.name ?? ""}
              placeholder="Ex: Robot 6 — Coluna 20t"
              required
              className="w-full px-3 py-2.5 rounded-lg border text-sm min-h-[44px] focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
            />
            {state?.fieldErrors?.name && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{state.fieldErrors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink)' }}>Descrição</label>
            <input
              name="description"
              defaultValue={robot?.description ?? ""}
              placeholder="Ex: Coluna com posicionador, capacidade 20 toneladas"
              className="w-full px-3 py-2.5 rounded-lg border text-sm min-h-[44px] focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink)' }}>Capacidade (kg) *</label>
              <input
                name="capacity_kg"
                type="number"
                defaultValue={robot?.capacity_kg ?? ""}
                placeholder="Ex: 15000"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm min-h-[44px] focus:ring-2 focus:outline-none"
                style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
              />
              {state?.fieldErrors?.capacity_kg && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{state.fieldErrors.capacity_kg[0]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink)' }}>Tipo de Setup *</label>
              <input
                name="setup_type"
                defaultValue={robot?.setup_type ?? ""}
                placeholder="Ex: coluna_posicionador"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm min-h-[44px] focus:ring-2 focus:outline-none"
                style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
              />
              {state?.fieldErrors?.setup_type && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{state.fieldErrors.setup_type[0]}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-ink)' }}>Capacidades</label>
            <input
              name="capabilities"
              defaultValue={robot?.capabilities?.join(", ") ?? ""}
              placeholder="Ex: coluna, posicionador, mesa_rotativa"
              className="w-full px-3 py-2.5 rounded-lg border text-sm min-h-[44px] focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-mute)' }}>Separar com vírgulas</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border text-sm font-medium min-h-[44px] hover:bg-gray-50 transition"
              style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white min-h-[44px] transition disabled:opacity-50"
              style={{ background: 'var(--color-brand)' }}
            >
              {isPending ? "A guardar..." : isEdit ? "Guardar" : "Criar Robot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
