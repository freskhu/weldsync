import { z } from "zod";

/**
 * Zod schemas for Project validation.
 * Single source of truth — use z.infer<typeof schema> for TypeScript types.
 */

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const projectCreateSchema = z.object({
  client_ref: z
    .string()
    .min(1, "Referência do cliente é obrigatória")
    .max(50, "Referência do cliente demasiado longa"),
  name: z
    .string()
    .min(1, "Nome do projeto é obrigatório")
    .max(200, "Nome do projeto demasiado longo"),
  client_name: z
    .string()
    .min(1, "Nome do cliente é obrigatório")
    .max(200, "Nome do cliente demasiado longo"),
  color: z
    .string()
    .regex(hexColorRegex, "Cor deve ser um código hex válido (#RRGGBB)")
    .default("#3B82F6"),
  deadline: z.string().date().nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).default("active"),
  notes: z.string().max(2000).nullable().optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
