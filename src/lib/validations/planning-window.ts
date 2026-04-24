import { z } from "zod";

/**
 * Zod schemas for PlanningWindow validation.
 * Single source of truth — use z.infer<typeof schema> for TypeScript types.
 *
 * Dates are ISO date strings (YYYY-MM-DD). Enforces end_date >= start_date
 * at the application level in addition to the DB CHECK constraint.
 */

export const planningWindowUpdateSchema = z
  .object({
    start_date: z.string().date("Data de início inválida (usa YYYY-MM-DD)"),
    end_date: z.string().date("Data de fim inválida (usa YYYY-MM-DD)"),
    label: z
      .string()
      .max(100, "Etiqueta demasiado longa")
      .nullable()
      .optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "Data de fim deve ser igual ou posterior à data de início",
    path: ["end_date"],
  });

export type PlanningWindowUpdateInput = z.infer<
  typeof planningWindowUpdateSchema
>;
