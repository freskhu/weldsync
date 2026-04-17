import { z } from "zod";

/**
 * Zod schemas for Piece validation.
 */

export const pieceCreateSchema = z.object({
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
  urgent: z.boolean().default(false),
  barcode: z.string().max(100).nullable().optional(),
  program_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).nullable().optional(),
});

export const pieceUpdateSchema = pieceCreateSchema.partial().omit({
  project_id: true,
});

export type PieceCreateInput = z.infer<typeof pieceCreateSchema>;
export type PieceUpdateInput = z.infer<typeof pieceUpdateSchema>;
