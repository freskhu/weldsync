"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  pieceCreateSchema,
  pieceUpdateSchema,
  withPlannedPeriodDefaults,
} from "@/lib/validations/piece";
import {
  createPiece as dbCreatePiece,
  updatePiece as dbUpdatePiece,
  deletePiece as dbDeletePiece,
  getPieceByReference,
  getPieceById,
  movePiece as dbMovePiece,
  linkProgram as dbLinkProgram,
  unlinkProgram as dbUnlinkProgram,
  allocatePiece as dbAllocatePiece,
  deallocatePiece as dbDeallocatePiece,
  PieceOverlapError,
} from "@/lib/data/store";
import type { PieceStatus } from "@/lib/types";

const PIECE_OVERLAP_MESSAGE =
  "Esta peça sobrepõe-se a outra já planeada no mesmo robot.";

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

function parsePiecePeriod(
  val: string | null
): "morning" | "afternoon" | null {
  if (val !== "morning" && val !== "afternoon") return null;
  return val;
}

export async function createPieceAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const projectId = formData.get("project_id") as string;

  const raw = withPlannedPeriodDefaults({
    project_id: projectId,
    reference: formData.get("reference") as string,
    description: (formData.get("description") as string) || null,
    material: (formData.get("material") as string) || null,
    wps: (formData.get("wps") as string) || null,
    quantity: parseNumber(formData.get("quantity") as string) ?? 1,
    weight_kg: parseNumber(formData.get("weight_kg") as string),
    estimated_hours: parseNumber(formData.get("estimated_hours") as string),
    planned_start_date: (formData.get("planned_start_date") as string) || null,
    planned_end_date: (formData.get("planned_end_date") as string) || null,
    planned_start_period: parsePiecePeriod(
      formData.get("planned_start_period") as string | null
    ),
    planned_end_period: parsePiecePeriod(
      formData.get("planned_end_period") as string | null
    ),
    urgent: formData.get("urgent") === "on",
    barcode: (formData.get("barcode") as string) || null,
  });

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
  const existing = await getPieceByReference(projectId, result.data.reference);
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

  try {
    await dbCreatePiece({
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
      planned_start_date: result.data.planned_start_date ?? null,
      planned_end_date: result.data.planned_end_date ?? null,
      planned_start_period: result.data.planned_start_period ?? null,
      planned_end_period: result.data.planned_end_period ?? null,
      urgent: result.data.urgent,
      barcode: result.data.barcode ?? null,
      program_id: null,
      position: null,
    });
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }

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

  const piece = await getPieceById(id);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  const raw = withPlannedPeriodDefaults({
    reference: formData.get("reference") as string,
    description: (formData.get("description") as string) || null,
    material: (formData.get("material") as string) || null,
    wps: (formData.get("wps") as string) || null,
    quantity: parseNumber(formData.get("quantity") as string) ?? 1,
    weight_kg: parseNumber(formData.get("weight_kg") as string),
    estimated_hours: parseNumber(formData.get("estimated_hours") as string),
    planned_start_date: (formData.get("planned_start_date") as string) || null,
    planned_end_date: (formData.get("planned_end_date") as string) || null,
    planned_start_period: parsePiecePeriod(
      formData.get("planned_start_period") as string | null
    ),
    planned_end_period: parsePiecePeriod(
      formData.get("planned_end_period") as string | null
    ),
    urgent: formData.get("urgent") === "on",
    barcode: (formData.get("barcode") as string) || null,
  });

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
    const existing = await getPieceByReference(piece.project_id, result.data.reference);
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

  try {
    await dbUpdatePiece(id, {
      ...(result.data.reference !== undefined && { reference: result.data.reference }),
      description: result.data.description ?? null,
      material: result.data.material ?? null,
      wps: result.data.wps ?? null,
      ...(result.data.quantity !== undefined && { quantity: result.data.quantity }),
      weight_kg: result.data.weight_kg ?? null,
      estimated_hours: result.data.estimated_hours ?? null,
      planned_start_date: result.data.planned_start_date ?? null,
      planned_end_date: result.data.planned_end_date ?? null,
      planned_start_period: result.data.planned_start_period ?? null,
      planned_end_period: result.data.planned_end_period ?? null,
      urgent: result.data.urgent ?? piece.urgent,
      barcode: result.data.barcode ?? null,
    });
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

const VALID_STATUSES: PieceStatus[] = [
  "backlog",
  "planned",
  "programmed",
  "allocated",
  "in_production",
  "completed",
];

export async function movePieceAction(
  pieceId: string,
  newStatus: PieceStatus
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peca em falta." };
  if (!VALID_STATUSES.includes(newStatus)) {
    return { success: false, error: "Estado invalido." };
  }

  let piece;
  try {
    if (newStatus === "completed") {
      // Drop to "Finalizados" — clear calendar slot + robot atomically.
      // The piece must leave the calendar and free the robot when finished.
      piece = await dbUpdatePiece(pieceId, {
        status: "completed",
        planned_start_date: null,
        planned_end_date: null,
        planned_start_period: null,
        planned_end_period: null,
        robot_id: null,
        scheduled_date: null,
        scheduled_period: null,
      });
    } else {
      piece = await dbMovePiece(pieceId, newStatus);
    }
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath("/planning");
  revalidatePath("/calendar");
  revalidatePath("/robots");
  return { success: true };
}

export async function deletePieceAction(
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const projectId = formData.get("project_id") as string;

  if (!id) return { success: false, error: "ID da peca em falta." };

  const result = await dbDeletePiece(id);
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

  const piece = await dbLinkProgram(pieceId, programId);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath(`/projects/${piece.project_id}`);
  return { success: true };
}

export async function unlinkProgramFromPiece(
  pieceId: string
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peca em falta." };

  const piece = await dbUnlinkProgram(pieceId);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath(`/projects/${piece.project_id}`);
  return { success: true };
}

// --- Allocation actions ---

const allocateSchema = z.object({
  pieceId: z.string().min(1, "ID da peca em falta."),
  robotId: z.coerce.number().int().positive("Robot invalido."),
  date: z.string().date(),
  period: z.enum(["AM", "PM"], { error: "Periodo deve ser AM ou PM." }),
});

export async function allocatePieceAction(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    pieceId: formData.get("pieceId") as string,
    robotId: formData.get("robotId") as string,
    date: formData.get("date") as string,
    period: formData.get("period") as string,
  };

  const result = allocateSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  const { pieceId, robotId, date, period } = result.data;

  let piece;
  try {
    piece = await dbAllocatePiece(pieceId, robotId, date, period);
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath("/planning");
  revalidatePath("/robots");
  return { success: true };
}

/**
 * Direct allocation action — accepts plain arguments instead of FormData.
 * Used by drag-and-drop in the Gantt/calendar views.
 */
export async function allocatePieceDirectAction(
  pieceId: string,
  robotId: number,
  date: string,
  period: "AM" | "PM"
): Promise<ActionResult> {
  const result = allocateSchema.safeParse({ pieceId, robotId, date, period });
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  let piece;
  try {
    piece = await dbAllocatePiece(
      result.data.pieceId,
      result.data.robotId,
      result.data.date,
      result.data.period
    );
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath("/calendar");
  revalidatePath("/planning");
  revalidatePath("/robots");
  return { success: true };
}

export async function deallocatePieceAction(
  formData: FormData
): Promise<ActionResult> {
  const pieceId = formData.get("pieceId") as string;
  if (!pieceId) return { success: false, error: "ID da peca em falta." };

  const piece = await dbDeallocatePiece(pieceId);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath("/planning");
  revalidatePath("/robots");
  return { success: true };
}

/**
 * Atomically sets a piece's status to "programmed" and assigns a robot_id.
 * Used by the kanban "Programada" column drop flow — the user picks which
 * robot was programmed and we persist both fields in one UPDATE.
 *
 * Does NOT touch dates (planned_*, scheduled_*). Robot picker is purely a
 * "which station did this get programmed on" record.
 */
export async function programPieceWithRobotAction(
  pieceId: string,
  robotId: number
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peca em falta." };
  if (!Number.isInteger(robotId) || robotId <= 0) {
    return { success: false, error: "Robot invalido." };
  }

  let piece;
  try {
    piece = await dbUpdatePiece(pieceId, {
      status: "programmed",
      robot_id: robotId,
    });
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath("/planning");
  revalidatePath("/calendar");
  revalidatePath("/robots");
  return { success: true };
}

// --- Planned range (span block) actions ---

const movePlannedRangeSchema = z
  .object({
    pieceId: z.string().min(1, "ID da peca em falta."),
    newStart: z.string().date(),
    newEnd: z.string().date(),
    // Half-day granularity. Optional for backwards compat: callers that omit
    // these get defaulted to morning/afternoon (full-day span) below.
    newStartPeriod: z.enum(["morning", "afternoon"]).optional(),
    newEndPeriod: z.enum(["morning", "afternoon"]).optional(),
    robotId: z.number().int().positive().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    // Use the same half-day ordinal comparison as the DB CHECK constraint.
    // Default periods if missing (backwards compat).
    const sp = val.newStartPeriod ?? "morning";
    const ep = val.newEndPeriod ?? "afternoon";
    const t1 = Date.parse(val.newStart + "T00:00:00Z");
    const t2 = Date.parse(val.newEnd + "T00:00:00Z");
    const d1 = Math.round(t1 / 86_400_000);
    const d2 = Math.round(t2 / 86_400_000);
    const startOrd = d1 * 2 + (sp === "morning" ? 0 : 1);
    const endOrd = d2 * 2 + (ep === "morning" ? 0 : 1);
    if (endOrd < startOrd) {
      ctx.addIssue({
        code: "custom",
        path: ["newEnd"],
        message:
          "Fim deve ser igual ou posterior ao início (considerando manhã/tarde).",
      });
    }
  });

/**
 * Shifts a piece's planned date range (and optionally reassigns robot).
 * Both dates are required together; end must be >= start at half-day resolution.
 * `newStartPeriod` / `newEndPeriod` are optional — omitted calls default to
 * morning/afternoon (full-day span) to keep existing Gantt drag code working.
 * Used by drag-to-move on the Gantt span blocks.
 */
export async function movePlannedRangeAction(input: {
  pieceId: string;
  newStart: string;
  newEnd: string;
  newStartPeriod?: "morning" | "afternoon";
  newEndPeriod?: "morning" | "afternoon";
  robotId?: number | null;
}): Promise<ActionResult> {
  const result = movePlannedRangeSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "_root";
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, fieldErrors };
  }

  const patch: Parameters<typeof dbUpdatePiece>[1] = {
    planned_start_date: result.data.newStart,
    planned_end_date: result.data.newEnd,
    planned_start_period: result.data.newStartPeriod ?? "morning",
    planned_end_period: result.data.newEndPeriod ?? "afternoon",
  };
  if (result.data.robotId !== undefined && result.data.robotId !== null) {
    patch.robot_id = result.data.robotId;
  }

  let piece;
  try {
    piece = await dbUpdatePiece(result.data.pieceId, patch);
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath("/planning");
  revalidatePath("/calendar");
  revalidatePath("/robots");
  return { success: true };
}

/**
 * Clears a piece's planned date range (removes it from the calendar).
 * Leaves scheduled_date / robot_id untouched — this only clears the span block.
 */
export async function clearPlannedRangeAction(
  pieceId: string
): Promise<ActionResult> {
  if (!pieceId || typeof pieceId !== "string") {
    return { success: false, error: "ID da peca em falta." };
  }

  const piece = await dbUpdatePiece(pieceId, {
    planned_start_date: null,
    planned_end_date: null,
    planned_start_period: null,
    planned_end_period: null,
  });
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  revalidatePath("/planning");
  revalidatePath("/calendar");
  revalidatePath("/robots");
  return { success: true };
}
