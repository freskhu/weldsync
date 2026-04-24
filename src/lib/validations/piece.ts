import { z } from "zod";

/**
 * Zod schemas for Piece validation.
 */

const pieceBaseObject = z.object({
  project_id: z.string().uuid("ID de projeto inválido"),
  reference: z
    .string()
    .min(1, "Referência da peça é obrigatória")
    .max(100, "Referência demasiado longa"),
  description: z.string().max(500).nullable().optional(),
  material: z.string().max(100).nullable().optional(),
  wps: z.string().max(50).nullable().optional(),
  quantity: z.number().int().min(1, "Quantidade mínima é 1").default(1),
  weight_kg: z.number().positive("Peso deve ser positivo").nullable().optional(),
  estimated_hours: z
    .number()
    .positive("Horas estimadas devem ser positivas")
    .nullable()
    .optional(),
  status: z
    .enum(["backlog", "programmed", "allocated", "in_production", "completed"])
    .default("backlog"),
  robot_id: z.number().int().positive().nullable().optional(),
  scheduled_date: z.string().date().nullable().optional(),
  scheduled_period: z.enum(["AM", "PM"]).nullable().optional(),
  planned_start_date: z.string().date().nullable().optional(),
  planned_end_date: z.string().date().nullable().optional(),
  planned_start_period: z.enum(["morning", "afternoon"]).nullable().optional(),
  planned_end_period: z.enum(["morning", "afternoon"]).nullable().optional(),
  urgent: z.boolean().default(false),
  barcode: z.string().max(100).nullable().optional(),
  program_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).nullable().optional(),
});

/**
 * Maps (date, period) to a half-day ordinal: dayIndex * 2 + periodIndex.
 * morning = 0, afternoon = 1. Higher ordinal = later in time.
 */
function halfDayOrdinal(date: string, period: "morning" | "afternoon"): number {
  // ISO date YYYY-MM-DD sorts lexicographically, but we need a numeric ordinal
  // to also fold in the period offset. Use epoch days from the date.
  const t = Date.parse(date + "T00:00:00Z");
  const dayIdx = Math.round(t / 86_400_000);
  return dayIdx * 2 + (period === "morning" ? 0 : 1);
}

function refinePlannedRange(
  val: {
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    planned_start_period?: "morning" | "afternoon" | null;
    planned_end_period?: "morning" | "afternoon" | null;
  },
  ctx: z.RefinementCtx
) {
  const sd = val.planned_start_date ?? null;
  const ed = val.planned_end_date ?? null;
  const sp = val.planned_start_period ?? null;
  const ep = val.planned_end_period ?? null;

  // Both-or-neither for dates
  if ((sd === null) !== (ed === null)) {
    ctx.addIssue({
      code: "custom",
      path: [sd === null ? "planned_start_date" : "planned_end_date"],
      message:
        "Data de início e data de fim planeadas devem ser preenchidas em conjunto.",
    });
    return;
  }

  // If a date is set, the matching period must be set too (Zod-layer coherence
  // matches the DB CHECK constraints). Callers that don't care about half-day
  // granularity can default to morning/afternoon (full day) before parsing —
  // see the `withPlannedPeriodDefaults` helper below and the server actions.
  if (sd !== null && sp === null) {
    ctx.addIssue({
      code: "custom",
      path: ["planned_start_period"],
      message:
        "Período de início (manhã/tarde) é obrigatório quando a data está preenchida.",
    });
  }
  if (ed !== null && ep === null) {
    ctx.addIssue({
      code: "custom",
      path: ["planned_end_period"],
      message:
        "Período de fim (manhã/tarde) é obrigatório quando a data está preenchida.",
    });
  }

  // Temporal ordering at half-day resolution: (end_date, end_period) >=
  // (start_date, start_period). Only applies if all four are set.
  if (sd !== null && ed !== null && sp !== null && ep !== null) {
    const startOrd = halfDayOrdinal(sd, sp);
    const endOrd = halfDayOrdinal(ed, ep);
    if (endOrd < startOrd) {
      ctx.addIssue({
        code: "custom",
        path: ["planned_end_date"],
        message:
          "Fim planeado deve ser igual ou posterior ao início (considerando manhã/tarde).",
      });
    }
  }
}

/**
 * Backwards-compat helper: if the caller supplied dates but no periods,
 * default start -> morning and end -> afternoon (full-day span). Mutates a
 * copy of the input and returns it. Use this in server actions BEFORE
 * handing the object to `pieceCreateSchema` / `pieceUpdateSchema` so legacy
 * callers that know nothing about half-day periods keep working.
 */
export function withPlannedPeriodDefaults<
  T extends {
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    planned_start_period?: "morning" | "afternoon" | null;
    planned_end_period?: "morning" | "afternoon" | null;
  }
>(input: T): T {
  const out = { ...input };
  if (
    out.planned_start_date != null &&
    (out.planned_start_period == null)
  ) {
    out.planned_start_period = "morning";
  }
  if (
    out.planned_end_date != null &&
    (out.planned_end_period == null)
  ) {
    out.planned_end_period = "afternoon";
  }
  return out;
}

export const pieceCreateSchema = pieceBaseObject.superRefine(refinePlannedRange);

export const pieceUpdateSchema = pieceBaseObject
  .omit({ project_id: true })
  .partial()
  .superRefine(refinePlannedRange);

export type PieceCreateInput = z.infer<typeof pieceCreateSchema>;
export type PieceUpdateInput = z.infer<typeof pieceUpdateSchema>;
