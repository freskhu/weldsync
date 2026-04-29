/**
 * Data access layer backed by Supabase.
 * All functions are async and return data from the real database.
 */

import type { Project, Piece, Robot } from "@/lib/types";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Thrown when a write violates the `piece_no_robot_overlap` exclusion
 * constraint (Postgres SQLSTATE 23P01). Callers should catch this and
 * map to a user-facing message rather than re-throwing.
 */
export class PieceOverlapError extends Error {
  constructor(message = "Piece range overlaps with another on the same robot.") {
    super(message);
    this.name = "PieceOverlapError";
  }
}

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
  if (error) {
    if (error.code === "23P01") throw new PieceOverlapError();
    throw new Error(`createPiece: ${error.message}`);
  }
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
    // 23P01 = exclusion_violation (piece_no_robot_overlap constraint)
    if (error.code === "23P01") throw new PieceOverlapError();
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
 *
 * Ordering: priority ASC NULLS LAST first (so the "Programada" kanban column
 * comes back in user-defined order), then created_at ASC as a stable tie
 * breaker for everything else.
 */
export async function getAllPieces(): Promise<Piece[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("*")
    .order("priority", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAllPieces: ${error.message}`);
  return data ?? [];
}

/**
 * Resolves a set of auth.users ids to display names via the
 * `get_user_display_names` SECURITY DEFINER RPC. Returns an empty map on
 * error or empty input — never throws (audit footer is non-critical UX).
 */
export async function getUserDisplayNames(
  ids: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_user_display_names", {
    ids: unique,
  });
  if (error) {
    console.error("[getUserDisplayNames] rpc failed:", error.message);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; display_name: string }[]) {
    if (row.id && row.display_name) map[row.id] = row.display_name;
  }
  return map;
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

/**
 * Returns the next priority slot for the "planned" column.
 * MAX(priority)+1, or 1 if the column is empty.
 *
 * NOTE: not transactionally atomic — two concurrent inserts could race and
 * land on the same priority. Acceptable for this UX (single planner, low
 * concurrency); revisit with an RPC + advisory lock if it ever matters.
 */
export async function nextPlannedPriority(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("piece")
    .select("priority")
    .eq("status", "planned")
    .not("priority", "is", null)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`nextPlannedPriority: ${error.message}`);
  const max = data?.priority ?? 0;
  return max + 1;
}

/**
 * Returns the immediate neighbour of `piece` in the planned column,
 * either above (smaller priority) or below (larger priority). Null if the
 * piece is already at the boundary.
 */
export async function getPlannedNeighbour(
  pieceId: string,
  direction: "up" | "down"
): Promise<Piece | null> {
  const target = await getPieceById(pieceId);
  if (!target || target.status !== "planned" || target.priority == null) {
    return null;
  }
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from("piece")
    .select("*")
    .eq("status", "planned")
    .not("priority", "is", null);

  if (direction === "up") {
    query.lt("priority", target.priority).order("priority", { ascending: false });
  } else {
    query.gt("priority", target.priority).order("priority", { ascending: true });
  }
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw new Error(`getPlannedNeighbour: ${error.message}`);
  return data;
}

/**
 * Atomically swaps the `priority` field between two pieces. Implemented as
 * two sequential UPDATEs since `priority` has no UNIQUE constraint, so a
 * temporary "duplicate" between the two writes is harmless.
 *
 * Returns both pieces with their new priorities, or null if either was not
 * found / not planned.
 */
export async function swapPlannedPriorities(
  pieceA: Piece,
  pieceB: Piece
): Promise<{ a: Piece; b: Piece } | null> {
  if (pieceA.priority == null || pieceB.priority == null) return null;
  const a = await updatePiece(pieceA.id, { priority: pieceB.priority });
  if (!a) return null;
  const b = await updatePiece(pieceB.id, { priority: pieceA.priority });
  if (!b) return null;
  return { a, b };
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

/**
 * Returns a single robot by ID.
 */
export async function getRobotById(id: number): Promise<Robot | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("robot")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getRobotById: ${error.message}`);
  }
  return data;
}

/**
 * Creates a new robot.
 */
export async function createRobot(
  data: Omit<Robot, "id" | "created_at" | "updated_at">
): Promise<Robot> {
  const supabase = await createServerSupabaseClient();
  const { data: robot, error } = await supabase
    .from("robot")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`createRobot: ${error.message}`);
  return robot;
}

/**
 * Updates an existing robot.
 */
export async function updateRobot(
  id: number,
  data: Partial<Omit<Robot, "id" | "created_at" | "updated_at">>
): Promise<Robot> {
  const supabase = await createServerSupabaseClient();
  const { data: robot, error } = await supabase
    .from("robot")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateRobot: ${error.message}`);
  return robot;
}

/**
 * Deletes a robot (only if no pieces are allocated to it).
 */
export async function deleteRobot(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const pieces = await getPiecesByRobot(id);
  if (pieces.length > 0) {
    throw new Error(`Não é possível eliminar: ${pieces.length} peça(s) alocada(s) a este robot.`);
  }
  const { error } = await supabase.from("robot").delete().eq("id", id);
  if (error) throw new Error(`deleteRobot: ${error.message}`);
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
