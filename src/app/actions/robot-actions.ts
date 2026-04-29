"use server";

import { revalidatePath } from "next/cache";
import {
  createRobot,
  updateRobot,
  deleteRobot,
  getRobotById,
} from "@/lib/data/store";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const robotSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).nullable().optional(),
  capacity_kg: z.coerce.number().int().positive("Capacidade deve ser positiva"),
  setup_type: z.string().min(1, "Tipo de setup é obrigatório").max(100),
  capabilities: z.string().optional(), // comma-separated, parsed below
});

export type RobotActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function createRobotAction(
  _prev: RobotActionState,
  formData: FormData
): Promise<RobotActionState> {
  const raw = {
    name: formData.get("name"),
    description: formData.get("description") || null,
    capacity_kg: formData.get("capacity_kg"),
    setup_type: formData.get("setup_type"),
    capabilities: formData.get("capabilities"),
  };

  const result = robotSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const capabilities = result.data.capabilities
    ? result.data.capabilities.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  try {
    const created = await createRobot({
      name: result.data.name,
      description: result.data.description ?? null,
      capacity_kg: result.data.capacity_kg,
      setup_type: result.data.setup_type,
      capabilities,
    });
    if (created) {
      const supabase = await createClient();
      await logAudit(
        supabase,
        "INSERT",
        "robot",
        String(created.id),
        null,
        created
      );
    }
    revalidatePath("/robots");
    revalidatePath("/planning");
    revalidatePath("/calendar");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar robot" };
  }
}

export async function updateRobotAction(
  _prev: RobotActionState,
  formData: FormData
): Promise<RobotActionState> {
  const id = Number(formData.get("id"));
  if (!id) return { error: "ID inválido" };

  const raw = {
    name: formData.get("name"),
    description: formData.get("description") || null,
    capacity_kg: formData.get("capacity_kg"),
    setup_type: formData.get("setup_type"),
    capabilities: formData.get("capabilities"),
  };

  const result = robotSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const capabilities = result.data.capabilities
    ? result.data.capabilities.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  try {
    const before = await getRobotById(id);
    const updated = await updateRobot(id, {
      name: result.data.name,
      description: result.data.description ?? null,
      capacity_kg: result.data.capacity_kg,
      setup_type: result.data.setup_type,
      capabilities,
    });
    if (updated) {
      const supabase = await createClient();
      await logAudit(supabase, "UPDATE", "robot", String(id), before, updated);
    }
    revalidatePath("/robots");
    revalidatePath("/planning");
    revalidatePath("/calendar");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao actualizar robot" };
  }
}

export async function deleteRobotAction(robotId: number): Promise<RobotActionState> {
  try {
    const before = await getRobotById(robotId);
    await deleteRobot(robotId);
    if (before) {
      const supabase = await createClient();
      await logAudit(supabase, "DELETE", "robot", String(robotId), before, null);
    }
    revalidatePath("/robots");
    revalidatePath("/planning");
    revalidatePath("/calendar");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao eliminar robot" };
  }
}
