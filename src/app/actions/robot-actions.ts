"use server";

import { revalidatePath } from "next/cache";
import { createRobot, updateRobot, deleteRobot } from "@/lib/data/store";
import { z } from "zod";

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
    await createRobot({
      name: result.data.name,
      description: result.data.description ?? null,
      capacity_kg: result.data.capacity_kg,
      setup_type: result.data.setup_type,
      capabilities,
    });
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
    await updateRobot(id, {
      name: result.data.name,
      description: result.data.description ?? null,
      capacity_kg: result.data.capacity_kg,
      setup_type: result.data.setup_type,
      capabilities,
    });
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
    await deleteRobot(robotId);
    revalidatePath("/robots");
    revalidatePath("/planning");
    revalidatePath("/calendar");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao eliminar robot" };
  }
}
