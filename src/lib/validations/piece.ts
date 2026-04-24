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
  urgent: z.boolean().default(false),
  barcode: z.string().max(100).nullable().optional(),
  program_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).nullable().optional(),
});

function refinePlannedDates(
  val: { planned_start_date?: string | null; planned_end_date?: string | null },
  ctx: z.RefinementCtx
) {
  const s = val.planned_start_date ?? null;
  const e = val.planned_end_date ?? null;
  // Both or neither
  if ((s === null) !== (e === null)) {
    ctx.addIssue({
      code: "custom",
      path: [s === null ? "planned_start_date" : "planned_end_date"],
      message:
        "Data de início e data de fim planeadas devem ser preenchidas em conjunto.",
    });
    return;
  }
  // end >= start
  if (s !== null && e !== null && e < s) {
    ctx.addIssue({
      code: "custom",
      path: ["planned_end_date"],
      message:
        "Data de fim planeada deve ser igual ou posterior à data de início planeada.",
    });
  }
}

export const pieceCreateSchema = pieceBaseObject.superRefine(refinePlannedDates);

export const pieceUpdateSchema = pieceBaseObject
  .omit({ project_id: true })
  .partial()
  .superRefine(refinePlannedDates);

export type PieceCreateInput = z.infer<typeof pieceCreateSchema>;
export type PieceUpdateInput = z.infer<typeof pieceUpdateSchema>;
