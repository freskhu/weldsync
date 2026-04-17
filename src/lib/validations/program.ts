import { z } from "zod";

/**
 * Zod schemas for Program validation.
 * Single source of truth — use z.infer<typeof schema> for TypeScript types.
 */

const ACCEPTED_FILE_EXTENSIONS = [".tp", ".ls"] as const;
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const programCreateSchema = z.object({
  piece_reference: z
    .string()
    .min(1, "Referência da peça é obrigatória")
    .max(200, "Referência demasiado longa"),
  client_ref: z.string().max(100, "Referência do cliente demasiado longa").nullable().optional(),
  is_template: z.boolean().default(false),
  template_id: z.string().uuid("ID de template inválido").nullable().optional(),
  robot_id: z.coerce.number().int().positive("Robot inválido").nullable().optional(),
  file_type: z.enum(["tp", "ls"], {
    error: "Tipo de ficheiro deve ser .tp ou .ls",
  }),
  file_name: z
    .string()
    .min(1, "Nome do ficheiro é obrigatório")
    .refine(
      (name) => ACCEPTED_FILE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
      "Ficheiro deve ter extensão .tp ou .ls"
    ),
  execution_time_min: z.coerce
    .number()
    .int()
    .positive("Tempo de execução deve ser positivo")
    .nullable()
    .optional(),
  wps: z.string().max(100, "WPS demasiado longo").nullable().optional(),
  notes: z.string().max(2000, "Notas demasiado longas").nullable().optional(),
});

export const programUpdateSchema = programCreateSchema
  .omit({ file_name: true, file_type: true })
  .partial();

/** Validate file before upload */
export const programFileSchema = z.object({
  name: z
    .string()
    .refine(
      (name) => ACCEPTED_FILE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
      "Apenas ficheiros .tp e .ls são aceites"
    ),
  size: z
    .number()
    .max(MAX_FILE_SIZE_BYTES, `Ficheiro demasiado grande (máximo ${MAX_FILE_SIZE_MB}MB)`),
});

export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
export { MAX_FILE_SIZE_MB, ACCEPTED_FILE_EXTENSIONS };
