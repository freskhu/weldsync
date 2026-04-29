"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { projectCreateSchema, projectUpdateSchema } from "@/lib/validations/project";
import {
  createProject as dbCreateProject,
  updateProject as dbUpdateProject,
  archiveProject as dbArchiveProject,
  getProjectByClientRef,
  getProjectById,
} from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createProjectAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    client_ref: formData.get("client_ref") as string,
    name: formData.get("name") as string,
    client_name: formData.get("client_name") as string,
    color: formData.get("color") as string || "#3B82F6",
    deadline: (formData.get("deadline") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  const result = projectCreateSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  // Check unique client_ref
  const existing = await getProjectByClientRef(result.data.client_ref);
  if (existing) {
    return {
      success: false,
      fieldErrors: {
        client_ref: ["Ja existe um projeto com esta referencia de cliente."],
      },
    };
  }

  const created = await dbCreateProject({
    client_ref: result.data.client_ref,
    name: result.data.name,
    client_name: result.data.client_name,
    color: result.data.color,
    deadline: result.data.deadline ?? null,
    start_date: result.data.start_date ?? null,
    end_date: result.data.end_date ?? null,
    status: result.data.status,
    notes: result.data.notes ?? null,
  });

  if (created) {
    const supabase = await createClient();
    await logAudit(supabase, "INSERT", "project", created.id, null, created);
  }

  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateProjectAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  if (!id) return { success: false, error: "ID do projeto em falta." };

  const project = await getProjectById(id);
  if (!project) return { success: false, error: "Projeto nao encontrado." };

  const raw = {
    client_ref: formData.get("client_ref") as string,
    name: formData.get("name") as string,
    client_name: formData.get("client_name") as string,
    color: formData.get("color") as string || project.color,
    deadline: (formData.get("deadline") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  const result = projectUpdateSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  // Check unique client_ref if changed
  if (result.data.client_ref && result.data.client_ref !== project.client_ref) {
    const existing = await getProjectByClientRef(result.data.client_ref);
    if (existing) {
      return {
        success: false,
        fieldErrors: {
          client_ref: ["Ja existe um projeto com esta referencia de cliente."],
        },
      };
    }
  }

  const updated = await dbUpdateProject(id, {
    ...(result.data.client_ref && { client_ref: result.data.client_ref }),
    ...(result.data.name && { name: result.data.name }),
    ...(result.data.client_name && { client_name: result.data.client_name }),
    ...(result.data.color && { color: result.data.color }),
    deadline: result.data.deadline ?? null,
    start_date: result.data.start_date ?? null,
    end_date: result.data.end_date ?? null,
    notes: result.data.notes ?? null,
  });

  if (updated) {
    const supabase = await createClient();
    await logAudit(supabase, "UPDATE", "project", id, project, updated);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function archiveProjectAction(
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  if (!id) return { success: false, error: "ID do projeto em falta." };

  const before = await getProjectById(id);
  if (!before) return { success: false, error: "Projeto nao encontrado." };

  const result = await dbArchiveProject(id);
  if (!result) return { success: false, error: "Projeto nao encontrado." };

  const supabase = await createClient();
  await logAudit(supabase, "UPDATE", "project", id, before, result);

  revalidatePath("/projects");
  return { success: true };
}
