"use server";

import { revalidatePath } from "next/cache";
import { planningWindowUpdateSchema } from "@/lib/validations/planning-window";
import {
  getActivePlanningWindow,
  updateActivePlanningWindow,
} from "@/lib/data/planning-window";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type PlanningWindowActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

/**
 * Updates the active planning window (start_date, end_date, optional label).
 * Revalidates /planning and /calendar so the new horizon is reflected
 * immediately in both views.
 */
export async function updatePlanningWindowAction(
  _prev: PlanningWindowActionState,
  formData: FormData
): Promise<PlanningWindowActionState> {
  const raw = {
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    label: (formData.get("label") as string | null) || null,
  };

  const result = planningWindowUpdateSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  try {
    const before = await getActivePlanningWindow();
    const updated = await updateActivePlanningWindow({
      start_date: result.data.start_date,
      end_date: result.data.end_date,
      label: result.data.label ?? null,
    });
    if (!updated) {
      return {
        error:
          "Nenhuma janela activa encontrada. Aplica a migration 00005_create_planning_window no Supabase.",
      };
    }

    const supabase = await createServerSupabaseClient();
    await logAudit(
      supabase,
      "UPDATE",
      "planning_window",
      String(updated.id),
      before,
      updated
    );

    revalidatePath("/planning");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao actualizar a janela",
    };
  }
}
