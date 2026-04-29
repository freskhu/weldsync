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
  linkProgram as dbLinkProgram,
  unlinkProgram as dbUnlinkProgram,
  PieceOverlapError,
  nextPlannedPriority,
  getPlannedNeighbour,
  swapPlannedPriorities,
} from "@/lib/data/store";
import type { Piece, PieceStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { logAudit, getCurrentUserId } from "@/lib/audit";

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

/**
 * Builds the audit fields injected on every status-changing mutation.
 * Centralized so that all entry/exit paths to "planned" stay consistent.
 */
function statusAuditPatch(userId: string | null) {
  return {
    last_status_change_by: userId,
    last_status_change_at: new Date().toISOString(),
  };
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

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

  // If creating directly into "planned", grab the next priority slot.
  const priority =
    result.data.status === "planned" ? await nextPlannedPriority() : null;

  let created;
  try {
    created = await dbCreatePiece({
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
      priority,
      last_status_change_by: userId,
      last_status_change_at: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }

  if (created) {
    await logAudit(supabase, "INSERT", "piece", created.id, null, created);
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

  let updated;
  try {
    updated = await dbUpdatePiece(id, {
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

  if (updated) {
    const supabase = await createClient();
    await logAudit(supabase, "UPDATE", "piece", id, piece, updated);
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

/**
 * Generic move action used by the kanban board for status transitions
 * EXCEPT "programmed" (which goes through programPieceWithRobotAction)
 * and "allocated" (which goes through allocatePieceAction).
 *
 * Centralizes:
 *   - audit fields (last_status_change_by/at)
 *   - priority lifecycle (cleared on exit from planned; assigned on entry
 *     to planned)
 *   - calendar/robot cleanup on "completed"
 *   - calendar/robot cleanup on move out of "allocated" (back to backlog/planned)
 */
export async function movePieceAction(
  pieceId: string,
  newStatus: PieceStatus
): Promise<ActionResult> {
  try {
    if (!pieceId) return { success: false, error: "ID da peca em falta." };
    if (!VALID_STATUSES.includes(newStatus)) {
      return { success: false, error: "Estado invalido." };
    }

    console.log("[movePieceAction] start", { pieceId, newStatus });

    const before = await getPieceById(pieceId);
    if (!before) return { success: false, error: "Peca nao encontrada." };

    const supabase = await createClient();
    const userId = await getCurrentUserId(supabase);

    console.log("[movePieceAction] user resolved", { userId, fromStatus: before.status });

    // Build the patch incrementally based on transition.
    const patch: Parameters<typeof dbUpdatePiece>[1] = {
      status: newStatus,
      ...statusAuditPatch(userId),
    };

    // Leaving "planned" -> clear priority slot.
    if (before.status === "planned" && newStatus !== "planned") {
      patch.priority = null;
    }

    // Entering "planned" -> assign next priority slot.
    if (before.status !== "planned" && newStatus === "planned") {
      try {
        patch.priority = await nextPlannedPriority();
        console.log("[movePieceAction] priority assigned", { priority: patch.priority });
      } catch (err) {
        console.error("[movePieceAction] nextPlannedPriority failed:", err instanceof Error ? err.message : String(err));
        return { success: false, error: "Falha ao calcular prioridade." };
      }
    }

    // "completed" drops the piece off the calendar AND off the robot.
    if (newStatus === "completed") {
      patch.planned_start_date = null;
      patch.planned_end_date = null;
      patch.planned_start_period = null;
      patch.planned_end_period = null;
      patch.robot_id = null;
      patch.scheduled_date = null;
      patch.scheduled_period = null;
    }

    // Moving OUT of "allocated" frees the calendar slot.
    if (before.status === "allocated" && newStatus !== "allocated") {
      patch.scheduled_date = null;
      patch.scheduled_period = null;
      if (newStatus === "backlog" || newStatus === "planned") {
        patch.robot_id = null;
      }
    }

    let piece;
    try {
      piece = await dbUpdatePiece(pieceId, patch);
      console.log("[movePieceAction] dbUpdatePiece ok", { pieceId, newStatus });
    } catch (err) {
      if (err instanceof PieceOverlapError) {
        return { success: false, error: PIECE_OVERLAP_MESSAGE };
      }
      console.error("[movePieceAction] dbUpdatePiece failed:", {
        pieceId,
        from: before.status,
        to: newStatus,
        userId,
        patch,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Não foi possível mover a peça.",
      };
    }
    if (!piece) return { success: false, error: "Peca nao encontrada." };

    try {
      await logAudit(supabase, "UPDATE", "piece", pieceId, before, piece);
    } catch (err) {
      console.error("[movePieceAction] logAudit threw (should never happen):", err instanceof Error ? err.message : String(err));
    }

    try {
      revalidatePath("/planning");
      revalidatePath("/calendar");
      revalidatePath("/robots");
    } catch (err) {
      console.error("[movePieceAction] revalidatePath failed:", err instanceof Error ? err.message : String(err));
    }

    return { success: true };
  } catch (err) {
    console.error("[movePieceAction] outer catch:", {
      pieceId,
      newStatus,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado.",
    };
  }
}

export async function deletePieceAction(
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  const projectId = formData.get("project_id") as string;

  if (!id) return { success: false, error: "ID da peca em falta." };

  const before = await getPieceById(id);
  if (!before) return { success: false, error: "Peca nao encontrada." };

  const result = await dbDeletePiece(id);
  if (!result) return { success: false, error: "Peca nao encontrada." };

  const supabase = await createClient();
  await logAudit(supabase, "DELETE", "piece", id, before, null);

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function linkProgramToPiece(
  pieceId: string,
  programId: string
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peca em falta." };
  if (!programId) return { success: false, error: "ID do programa em falta." };

  const before = await getPieceById(pieceId);
  if (!before) return { success: false, error: "Peca nao encontrada." };

  const piece = await dbLinkProgram(pieceId, programId);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  const supabase = await createClient();
  await logAudit(supabase, "UPDATE", "piece", pieceId, before, piece);

  revalidatePath(`/projects/${piece.project_id}`);
  return { success: true };
}

export async function unlinkProgramFromPiece(
  pieceId: string
): Promise<ActionResult> {
  if (!pieceId) return { success: false, error: "ID da peca em falta." };

  const before = await getPieceById(pieceId);
  if (!before) return { success: false, error: "Peca nao encontrada." };

  const piece = await dbUnlinkProgram(pieceId);
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  const supabase = await createClient();
  await logAudit(supabase, "UPDATE", "piece", pieceId, before, piece);

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

  return allocatePieceCore(
    result.data.pieceId,
    result.data.robotId,
    result.data.date,
    result.data.period
  );
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

  return allocatePieceCore(
    result.data.pieceId,
    result.data.robotId,
    result.data.date,
    result.data.period
  );
}

/**
 * Shared allocation pipeline. Sets status='allocated', clears priority if the
 * piece was in "planned", and stamps the audit fields.
 */
async function allocatePieceCore(
  pieceId: string,
  robotId: number,
  date: string,
  period: "AM" | "PM"
): Promise<ActionResult> {
  const before = await getPieceById(pieceId);
  if (!before) return { success: false, error: "Peca nao encontrada." };

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

  const patch: Parameters<typeof dbUpdatePiece>[1] = {
    status: "allocated",
    robot_id: robotId,
    scheduled_date: date,
    scheduled_period: period,
    ...statusAuditPatch(userId),
  };
  if (before.status === "planned") patch.priority = null;

  let piece;
  try {
    piece = await dbUpdatePiece(pieceId, patch);
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  await logAudit(supabase, "UPDATE", "piece", pieceId, before, piece);

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

  const before = await getPieceById(pieceId);
  if (!before) return { success: false, error: "Peca nao encontrada." };

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

  const piece = await dbUpdatePiece(pieceId, {
    status: "backlog",
    robot_id: null,
    scheduled_date: null,
    scheduled_period: null,
    priority: null,
    ...statusAuditPatch(userId),
  });
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  await logAudit(supabase, "UPDATE", "piece", pieceId, before, piece);

  revalidatePath("/planning");
  revalidatePath("/robots");
  return { success: true };
}

/**
 * Atomically sets a piece's status to "programmed" and assigns a robot_id.
 * Used by the kanban "Programada" column drop flow — the user picks which
 * robot was programmed and we persist both fields in one UPDATE.
 *
 * Priority lives on the "planned" column, not here — so on entry to
 * programmed we always clear `priority` (in case the piece is coming from
 * planned with a slot assigned).
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

  const before = await getPieceById(pieceId);
  if (!before) return { success: false, error: "Peca nao encontrada." };

  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

  const patch: Parameters<typeof dbUpdatePiece>[1] = {
    status: "programmed",
    robot_id: robotId,
    priority: null,
    ...statusAuditPatch(userId),
  };

  let piece;
  try {
    piece = await dbUpdatePiece(pieceId, patch);
  } catch (err) {
    if (err instanceof PieceOverlapError) {
      return { success: false, error: PIECE_OVERLAP_MESSAGE };
    }
    throw err;
  }
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  await logAudit(supabase, "UPDATE", "piece", pieceId, before, piece);

  revalidatePath("/planning");
  revalidatePath("/calendar");
  revalidatePath("/robots");
  return { success: true };
}

// --- Planned priority reorder (▲▼ arrows on Planeados column) ---

async function reorderPlanned(
  pieceId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  try {
    if (!pieceId) return { success: false, error: "ID da peca em falta." };

    console.log("[reorderPlanned] start", { pieceId, direction });

    const target = await getPieceById(pieceId);
    if (!target) return { success: false, error: "Peca nao encontrada." };
    if (target.status !== "planned") {
      return { success: false, error: "Peca nao esta na coluna Planeados." };
    }
    if (target.priority == null) {
      console.log("[reorderPlanned] backfill priority");
      await dbUpdatePiece(pieceId, { priority: await nextPlannedPriority() });
      try { revalidatePath("/planning"); } catch (e) { console.error("[reorderPlanned] revalidate failed:", e); }
      return { success: true };
    }

    const neighbour = await getPlannedNeighbour(pieceId, direction);
    if (!neighbour) {
      console.log("[reorderPlanned] no neighbour, boundary");
      try { revalidatePath("/planning"); } catch (e) { console.error("[reorderPlanned] revalidate failed:", e); }
      return { success: true };
    }

    const swapped = await swapPlannedPriorities(target, neighbour);
    if (!swapped) {
      return { success: false, error: "Falha ao reordenar." };
    }

    console.log("[reorderPlanned] swap done");
    try { revalidatePath("/planning"); } catch (e) { console.error("[reorderPlanned] revalidate failed:", e); }
    return { success: true };
  } catch (err) {
    console.error("[reorderPlanned] outer catch:", {
      pieceId,
      direction,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro inesperado.",
    };
  }
}

export async function movePieceUpAction(
  pieceId: string
): Promise<ActionResult> {
  return reorderPlanned(pieceId, "up");
}

export async function movePieceDownAction(
  pieceId: string
): Promise<ActionResult> {
  return reorderPlanned(pieceId, "down");
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

  const before = await getPieceById(result.data.pieceId);
  if (!before) return { success: false, error: "Peca nao encontrada." };

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

  const supabase = await createClient();
  await logAudit(supabase, "UPDATE", "piece", result.data.pieceId, before, piece);

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

  const before = await getPieceById(pieceId);
  if (!before) return { success: false, error: "Peca nao encontrada." };

  const piece = await dbUpdatePiece(pieceId, {
    planned_start_date: null,
    planned_end_date: null,
    planned_start_period: null,
    planned_end_period: null,
  });
  if (!piece) return { success: false, error: "Peca nao encontrada." };

  const supabase = await createClient();
  await logAudit(supabase, "UPDATE", "piece", pieceId, before, piece);

  revalidatePath("/planning");
  revalidatePath("/calendar");
  revalidatePath("/robots");
  return { success: true };
}

// Re-export Piece type for callers that import alongside actions.
export type { Piece };
