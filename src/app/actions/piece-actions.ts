"use server";

import { revalidatePath } from "next/cache";
import { pieceCreateSchema, pieceUpdateSchema } from "@/lib/validations/piece";
import {
  createPiece as dbCreatePiece,
  updatePiece as dbUpdatePiece,
  deletePiece as dbDeletePiece,
  getPieceByReference,
  getPieceById,
  movePiece as dbMovePiece,
  linkProgram as dbLinkProgram,
  unlinkProgram as dbUnlinkProgram,
} from "@/lib/data/store";
import type { PieceStatus } from "@/lib/types";

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseNumber(val: string | null): number | null {
  if (!val || val.trim() === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export async function createPieceAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const projectId = formData.get("project_id") as string;

  const raw = {
    project_id: projectId,
    reference: formData.get("reference") as string,
    description: (formData.get("description") as string) || null,
    material: (formData.get("material") as string) || null,
    wps: (formData.get("wps") as string) || null,
    quantity: parseNumber(formData.get("quantity") as string) ?? 1,
    weight_kg: parseNumber(formData.get("weight_kg") as string),
    estimated_hours: parseNumber(formData.get("estimated_hours") as string),
    urgent: formData.get("urgent") === "on",
    barcode: (formData.get("barcode") as string) || null,
  };

  const result = pieceCreateSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  // Check unique (project_id, reference)
  const existing = getPieceByReference(projectId, result.data.reference);
  if (existing) {
    return {
      success: false,
      fieldErrors: {
        reference: [
          "Ja existe uma peca com esta referencia neste projeto.",
        ],
      },
    };
  }

  dbCreatePiece({
    project_id: result.data.project_id,
    reference: result.data.reference,
    description: result.data.description ?? null,
    material: result.data.material ?? null,
    wps: result.data.wps ?? null,
    quantity: result.data.quantity,
    weight_kg: result.data.weight_kg ?? null,
    estimated_hours: result.data.estimated_hours ?? null,
    status: result.data.status,
    robot_id: null,
    scheduled_date: null,
    scheduled_period: null,
    urgent: result.data.urgent,
    barcode: result.data.barcode ?? null,
    program_id: null,
    position: null,
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updatePieceAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const projectId = formData.get("project_id") as string;

  if (!id) return { success: false, error: "ID da peca em falta." };

  const piece = getPieceById(id);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  const raw = {
    reference: formData.get("reference") as string,
    description: (formData.get("description") as string) || null,
    material: (formData.get("material") as string) || null,
    wps: (formData.get("wps") as string) || null,
    quantity: parseNumber(formData.get("quantity") as string) ?? 1,
    weight_kg: parseNumber(formData.get("weight_kg") as string),
    estimated_hours: parseNumber(formData.get("estimated_hours") as string),
    urgent: formData.get("urgent") === "on",
    barcode: (formData.get("barcode") as string) || null,
  };

  const result = pieceUpdateSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  // Check unique (project_id, reference) if reference changed
  if (result.data.reference && result.data.reference !== piece.reference) {
    const existing = getPieceByReference(piece.project_id, result.data.reference);
    if (existing) {
      return {
        success: false,
        fieldErrors: {
          reference: [
            "Ja existe uma peca com esta referencia neste projeto.",
          ],
        },
      };
    }
  }

  dbUpdatePiece(id, {
    ...(result.data.reference !== undefined && { reference: result.data.reference }),
    description: result.data.description ?? null,
    material: result.data.material ?? null,
    wps: result.data.wps ?? null,
    ...(result.data.quantity !== undefined && { quantity: result.data.quantity }),
    weight_kg: result.data.weight_kg ?? null,
    estimated_hours: result.data.estimated_hours ?? null,
    urgent: result.data.urgent ?? piece.urgent,
    barcode: result.data.barcode ?? null,
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

const VALID_STATUSES: PieceStatus[] = [
  "backlog",
  "programmed",
  "allocated",
  "in_production",
  "completed",
];

export async function movePieceAction(
  pieceId: string,
  newStatus: PieceStatus
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peça em falta." };
  if (!VALID_STATUSES.includes(newStatus)) {
    return { success: false, error: "Estado inválido." };
  }

  const piece = dbMovePiece(pieceId, newStatus);
  if (!piece) return { success: false, error: "Peça não encontrada." };

  revalidatePath("/planning");
  return { success: true };
}

export async function deletePieceAction(
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const projectId = formData.get("project_id") as string;

  if (!id) return { success: false, error: "ID da peca em falta." };

  const result = dbDeletePiece(id);
  if (!result) return { success: false, error: "Peca nao encontrada." };

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function linkProgramToPiece(
  pieceId: string,
  programId: string
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peca em falta." };
  if (!programId) return { success: false, error: "ID do programa em falta." };

  const piece = dbLinkProgram(pieceId, programId);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath(`/projects/${piece.project_id}`);
  return { success: true };
}

export async function unlinkProgramFromPiece(
  pieceId: string
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peca em falta." };

  const piece = dbUnlinkProgram(pieceId);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath(`/projects/${piece.project_id}`);
  return { success: true };
}
