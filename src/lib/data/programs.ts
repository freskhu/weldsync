/**
 * Data access layer for Programs.
 * Backed by Supabase queries + Storage for file uploads.
 */

import type { Program, Robot } from "@/lib/types";
import type {
  ProgramCreateInput,
  ProgramUpdateInput,
} from "@/lib/validations/program";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getAllRobots } from "@/lib/data/store";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ProgramFilters {
  search?: string;
  client_ref?: string;
  robot_id?: number;
  is_template?: boolean;
}

export async function getPrograms(
  filters?: ProgramFilters
): Promise<Program[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("program").select("*");

  if (filters?.search) {
    // Use ilike for flexible search across multiple columns
    const term = `%${filters.search}%`;
    query = query.or(
      `piece_reference.ilike.${term},client_ref.ilike.${term},notes.ilike.${term},file_name.ilike.${term}`
    );
  }
  if (filters?.client_ref) {
    query = query.eq("client_ref", filters.client_ref);
  }
  if (filters?.robot_id !== undefined && filters.robot_id !== null) {
    query = query.eq("robot_id", filters.robot_id);
  }
  if (filters?.is_template !== undefined) {
    query = query.eq("is_template", filters.is_template);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) throw new Error(`getPrograms: ${error.message}`);
  return data ?? [];
}

export async function getProgramById(id: string): Promise<Program | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("program")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getProgramById: ${error.message}`);
  }
  return data;
}

export async function getTemplatePrograms(): Promise<Program[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("program")
    .select("*")
    .eq("is_template", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getTemplatePrograms: ${error.message}`);
  return data ?? [];
}

export async function createProgram(
  input: ProgramCreateInput,
  fileUrl: string
): Promise<Program> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("program")
    .insert({
      piece_reference: input.piece_reference,
      client_ref: input.client_ref ?? null,
      is_template: input.is_template,
      template_id: input.template_id ?? null,
      robot_id: input.robot_id ?? null,
      file_type: input.file_type,
      file_url: fileUrl,
      file_name: input.file_name,
      execution_time_min: input.execution_time_min ?? null,
      wps: input.wps ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createProgram: ${error.message}`);
  return data;
}

export async function updateProgram(
  id: string,
  input: ProgramUpdateInput
): Promise<Program | null> {
  const supabase = await createServerSupabaseClient();

  // Build the update payload, only including fields that were provided
  const updateData: Record<string, unknown> = {};
  if (input.piece_reference !== undefined)
    updateData.piece_reference = input.piece_reference;
  if (input.client_ref !== undefined)
    updateData.client_ref = input.client_ref ?? null;
  if (input.is_template !== undefined)
    updateData.is_template = input.is_template;
  if (input.template_id !== undefined)
    updateData.template_id = input.template_id ?? null;
  if (input.robot_id !== undefined)
    updateData.robot_id = input.robot_id ?? null;
  if (input.execution_time_min !== undefined)
    updateData.execution_time_min = input.execution_time_min ?? null;
  if (input.wps !== undefined) updateData.wps = input.wps ?? null;
  if (input.notes !== undefined) updateData.notes = input.notes ?? null;

  const { data, error } = await supabase
    .from("program")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`updateProgram: ${error.message}`);
  }
  return data;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  // Get the program first to find the file path for storage cleanup
  const { data: program } = await supabase
    .from("program")
    .select("file_url")
    .eq("id", id)
    .single();

  // Clean up storage file if it exists and is a Supabase storage URL
  if (program?.file_url) {
    // Extract path from the public URL if it's a Supabase storage URL
    const storagePrefix = "/storage/v1/object/public/programs/";
    const idx = program.file_url.indexOf(storagePrefix);
    if (idx !== -1) {
      const filePath = program.file_url.substring(idx + storagePrefix.length);
      await supabase.storage.from("programs").remove([filePath]);
    }
  }

  // Clear template_id references in other programs
  await supabase
    .from("program")
    .update({ template_id: null })
    .eq("template_id", id);

  // Delete the program record
  const { error } = await supabase.from("program").delete().eq("id", id);
  if (error) throw new Error(`deleteProgram: ${error.message}`);
  return true;
}

export async function getRobots(): Promise<Robot[]> {
  return getAllRobots();
}

/** Get unique client refs from existing programs */
export async function getUniqueClientRefs(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("program")
    .select("client_ref")
    .not("client_ref", "is", null);
  if (error) throw new Error(`getUniqueClientRefs: ${error.message}`);

  const refs = new Set<string>();
  for (const row of data ?? []) {
    if (row.client_ref) refs.add(row.client_ref);
  }
  return Array.from(refs).sort();
}

// ---------------------------------------------------------------------------
// Program suggestion engine
// ---------------------------------------------------------------------------

export interface SuggestedProgram extends Program {
  /** Relevance score (higher = better match). Used for sorting. */
  relevance: number;
  /** Human-readable match reason */
  match_reason: string;
}

/**
 * Suggest programs that match a piece reference and optional client ref.
 * Algorithm: exact > partial > fuzzy. Templates ranked above specifics.
 */
export async function suggestPrograms(
  pieceReference: string,
  clientRef?: string
): Promise<SuggestedProgram[]> {
  if (!pieceReference || pieceReference.trim().length === 0) return [];

  const supabase = await createServerSupabaseClient();
  const query = pieceReference.toLowerCase().trim();

  // Fetch all programs for scoring (program table is small enough for this)
  const { data: allPrograms, error } = await supabase
    .from("program")
    .select("*");
  if (error) throw new Error(`suggestPrograms: ${error.message}`);

  const scored: SuggestedProgram[] = [];

  for (const program of allPrograms ?? []) {
    const progRef = program.piece_reference.toLowerCase();
    let relevance = 0;
    let match_reason = "";

    // Exact match on piece_reference
    if (progRef === query) {
      relevance = 100;
      match_reason = "Referencia exacta";
    }
    // Partial match (contains)
    else if (progRef.includes(query) || query.includes(progRef)) {
      relevance = 60;
      match_reason = "Referencia parcial";
    }
    // Fuzzy: check if words overlap
    else {
      const queryParts = query.split(/[-_\s]+/).filter(Boolean);
      const progParts = progRef.split(/[-_\s]+/).filter(Boolean);
      const overlap = queryParts.filter((qp: string) =>
        progParts.some((pp: string) => pp.includes(qp) || qp.includes(pp))
      );
      if (overlap.length > 0) {
        relevance = 20 + (overlap.length / queryParts.length) * 20;
        match_reason = "Correspondencia parcial";
      }
    }

    // Client ref boost
    if (clientRef && program.client_ref) {
      if (program.client_ref.toLowerCase() === clientRef.toLowerCase()) {
        relevance += 15;
        if (match_reason) match_reason += " + cliente";
        else {
          relevance = Math.max(relevance, 30);
          match_reason = "Mesmo cliente";
        }
      }
    }

    // Template bonus (templates rank above specifics at same relevance)
    if (program.is_template && relevance > 0) {
      relevance += 5;
    }

    if (relevance > 0) {
      scored.push({ ...program, relevance, match_reason });
    }
  }

  // Sort by relevance descending, then templates first, then newest first
  scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    if (a.is_template !== b.is_template) return a.is_template ? -1 : 1;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return scored.slice(0, 10);
}
