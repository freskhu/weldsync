"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { programCreateSchema, programUpdateSchema } from "@/lib/validations/program";
import {
  createProgram,
  updateProgram,
  deleteProgram,
} from "@/lib/data/programs";

// ---------------------------------------------------------------------------
// Types for form state
// ---------------------------------------------------------------------------

export interface ActionState {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Upload (create) a program
// ---------------------------------------------------------------------------

export async function uploadProgramAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const file = formData.get("file") as File | null;

  // Validate file presence
  if (!file || file.size === 0) {
    return { success: false, error: "Ficheiro é obrigatório" };
  }

  // Validate file extension
  const fileName = file.name;
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  if (ext !== ".tp" && ext !== ".ls") {
    return { success: false, error: "Apenas ficheiros .tp e .ls são aceites" };
  }

  // Validate file size (50MB)
  if (file.size > 50 * 1024 * 1024) {
    return { success: false, error: "Ficheiro demasiado grande (máximo 50MB)" };
  }

  // Determine file_type from extension
  const fileType = ext === ".tp" ? "tp" : "ls";

  // Parse form fields
  const raw = {
    piece_reference: formData.get("piece_reference"),
    client_ref: formData.get("client_ref") || null,
    is_template: formData.get("is_template") === "on",
    template_id: formData.get("template_id") || null,
    robot_id: formData.get("robot_id") ? Number(formData.get("robot_id")) : null,
    file_type: fileType,
    file_name: fileName,
    execution_time_min: formData.get("execution_time_min")
      ? Number(formData.get("execution_time_min"))
      : null,
    wps: formData.get("wps") || null,
    notes: formData.get("notes") || null,
  };

  const parsed = programCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Dados inválidos", fieldErrors };
  }

  // Mock file URL — in production this would be a Supabase Storage signed URL
  const mockFileUrl = `/storage/programs/${Date.now()}-${fileName}`;

  try {
    await createProgram(parsed.data, mockFileUrl);
  } catch {
    return { success: false, error: "Erro ao criar programa" };
  }

  revalidatePath("/programs");
  redirect("/programs");
}

// ---------------------------------------------------------------------------
// Update program metadata
// ---------------------------------------------------------------------------

export async function updateProgramAction(
  id: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    piece_reference: formData.get("piece_reference") as string,
    client_ref: formData.get("client_ref") || null,
    is_template: formData.get("is_template") === "on",
    template_id: formData.get("template_id") || null,
    robot_id: formData.get("robot_id") ? Number(formData.get("robot_id")) : null,
    execution_time_min: formData.get("execution_time_min")
      ? Number(formData.get("execution_time_min"))
      : null,
    wps: formData.get("wps") || null,
    notes: formData.get("notes") || null,
  };

  const parsed = programUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Dados inválidos", fieldErrors };
  }

  const updated = await updateProgram(id, parsed.data);
  if (!updated) {
    return { success: false, error: "Programa não encontrado" };
  }

  revalidatePath("/programs");
  revalidatePath(`/programs/${id}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete program
// ---------------------------------------------------------------------------

export async function deleteProgramAction(id: string): Promise<ActionState> {
  const deleted = await deleteProgram(id);
  if (!deleted) {
    return { success: false, error: "Programa não encontrado" };
  }

  revalidatePath("/programs");
  redirect("/programs");
}
