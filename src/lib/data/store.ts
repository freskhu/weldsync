/**
 * Data access layer backed by Supabase.
 * All functions are async and return data from the real database.
 */

import type { Project, Piece, Robot } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// --- Project queries ---

export async function getProjects(includeArchived = false): Promise<Project[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("project").select("*");
  if (!includeArchived) {
    query = query.neq("status", "archived");
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`getProjects: ${error.message}`);
  return data ?? [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("project")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`getProjectById: ${error.message}`);
  }
  return data;
}

export async function getProjectByClientRef(
  clientRef: string
): Promise<Project | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("project")
    .select("*")
    .eq("client_ref", clientRef)
    .maybeSingle();
  if (error) throw new Error(`getProjectByClientRef: ${error.message}`);
  return data;
}

export async function createProject(
  data: Omit<Project, "id" | "created_at" | "updated_at">
): Promise<Project> {
  const supabase = await createServerSupabaseClient();
  const { data: project, error } = await supabase
    .from("project")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`createProject: ${error.message}`);
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, "id" | "created_at" | "updated_at">>
): Promise<Project | null> {
  const supabase = await createServerSupabaseClient();
  const { data: project, error } = await supabase
    .from("project")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`updateProject: ${error.message}`);
  }
  return project;
}

export async function archiveProject(id: string): Promise<Project | null> {
  return updateProject(id, { status: "archived" });
}

// --- Piece queries ---

export async function getPiecesByProject(projectId: string): Promise<Piece[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`getPiecesByProject: ${error.message}`);
  return data ?? [];
}

export async function getPieceById(id: string): Promise<Piece | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getPieceById: ${error.message}`);
  }
  return data;
}

export async function getPieceByReference(
  projectId: string,
  reference: string
): Promise<Piece | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("*")
    .eq("project_id", projectId)
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error(`getPieceByReference: ${error.message}`);
  return data;
}

export async function createPiece(
  data: Omit<Piece, "id" | "created_at" | "updated_at">
): Promise<Piece> {
  const supabase = await createServerSupabaseClient();
  const { data: piece, error } = await supabase
    .from("piece")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`createPiece: ${error.message}`);
  return piece;
}

export async function updatePiece(
  id: string,
  data: Partial<Omit<Piece, "id" | "project_id" | "created_at" | "updated_at">>
): Promise<Piece | null> {
  const supabase = await createServerSupabaseClient();
  const { data: piece, error } = await supabase
    .from("piece")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`updatePiece: ${error.message}`);
  }
  return piece;
}

export async function deletePiece(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("piece")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deletePiece: ${error.message}`);
  // If no error, consider it successful (count may be null without .select())
  return true;
}

export async function getPieceCountByProject(
  projectId: string
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("piece")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw new Error(`getPieceCountByProject: ${error.message}`);
  return count ?? 0;
}

/**
 * Returns a map of project_id -> piece count for all projects.
 */
export async function getAllPieceCounts(): Promise<Map<string, number>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("project_id");
  if (error) throw new Error(`getAllPieceCounts: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Returns all pieces across all projects.
 */
export async function getAllPieces(): Promise<Piece[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAllPieces: ${error.message}`);
  return data ?? [];
}

/**
 * Moves a piece to a new status. Returns the updated piece or null if not found.
 */
export async function movePiece(
  pieceId: string,
  newStatus: Piece["status"]
): Promise<Piece | null> {
  return updatePiece(pieceId, { status: newStatus });
}

// --- Allocation ---

/**
 * Allocates a piece to a robot on a specific date and period.
 * Sets status to 'allocated'.
 */
export async function allocatePiece(
  pieceId: string,
  robotId: number,
  date: string,
  period: "AM" | "PM"
): Promise<Piece | null> {
  return updatePiece(pieceId, {
    status: "allocated",
    robot_id: robotId,
    scheduled_date: date,
    scheduled_period: period,
  });
}

/**
 * Removes allocation from a piece, returning it to backlog.
 */
export async function deallocatePiece(pieceId: string): Promise<Piece | null> {
  return updatePiece(pieceId, {
    status: "backlog",
    robot_id: null,
    scheduled_date: null,
    scheduled_period: null,
  });
}

/**
 * Returns the number of pieces allocated to a robot on a given date.
 */
export async function getRobotLoad(
  robotId: number,
  date: string
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("piece")
    .select("*", { count: "exact", head: true })
    .eq("robot_id", robotId)
    .eq("scheduled_date", date);
  if (error) throw new Error(`getRobotLoad: ${error.message}`);
  return count ?? 0;
}

/**
 * Returns all robots.
 */
export async function getAllRobots(): Promise<Robot[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("robot")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw new Error(`getAllRobots: ${error.message}`);
  return data ?? [];
}

/**
 * Returns all pieces allocated to a specific robot.
 */
export async function getPiecesByRobot(robotId: number): Promise<Piece[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("*")
    .eq("robot_id", robotId)
    .order("scheduled_date", { ascending: true });
  if (error) throw new Error(`getPiecesByRobot: ${error.message}`);
  return data ?? [];
}

// --- Program linking ---

export async function linkProgram(
  pieceId: string,
  programId: string
): Promise<Piece | null> {
  return updatePiece(pieceId, { program_id: programId });
}

export async function unlinkProgram(pieceId: string): Promise<Piece | null> {
  return updatePiece(pieceId, { program_id: null });
}
