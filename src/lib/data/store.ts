/**
 * In-memory data store for development.
 * Structured to be easily swapped for Supabase queries later.
 * Each function mirrors what a Supabase query would return.
 */

import type { Project, Piece } from "@/lib/types";

// --- Seed data ---

const seedProjects: Project[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    client_ref: "CRV-2024-001",
    name: "Estrutura Nave Industrial",
    client_name: "Construções Silva",
    color: "#3B82F6",
    deadline: "2026-05-30",
    status: "active",
    notes: "Projeto prioritário — entrega até fim de maio.",
    created_at: "2026-03-10T08:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    client_ref: "CRV-2024-002",
    name: "Bancadas Aço Inox",
    client_name: "Padaria Moderna",
    color: "#10B981",
    deadline: "2026-06-15",
    status: "active",
    notes: null,
    created_at: "2026-03-15T09:00:00Z",
    updated_at: "2026-03-15T09:00:00Z",
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    client_ref: "CRV-2024-003",
    name: "Escada Metálica",
    client_name: "Câmara de Leiria",
    color: "#F59E0B",
    deadline: null,
    status: "active",
    notes: "Sem prazo definido, aguarda aprovação camarária.",
    created_at: "2026-04-01T11:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
  },
];

const seedPieces: Piece[] = [
  {
    id: "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
    project_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    reference: "VIG-01",
    description: "Viga principal HEB300",
    material: "S355JR",
    wps: "WPS-001",
    quantity: 4,
    weight_kg: 320,
    estimated_hours: 8,
    status: "backlog",
    robot_id: null,
    scheduled_date: null,
    scheduled_period: null,
    urgent: false,
    barcode: "VIG01-001",
    program_id: null,
    position: 0,
    created_at: "2026-03-12T08:00:00Z",
    updated_at: "2026-03-12T08:00:00Z",
  },
  {
    id: "p2b3c4d5-e6f7-8901-bcde-f12345678901",
    project_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    reference: "PIR-01",
    description: "Pilar HEB200",
    material: "S355JR",
    wps: "WPS-001",
    quantity: 8,
    weight_kg: 180,
    estimated_hours: 4,
    status: "backlog",
    robot_id: null,
    scheduled_date: null,
    scheduled_period: null,
    urgent: true,
    barcode: "PIR01-001",
    program_id: null,
    position: 1,
    created_at: "2026-03-12T08:30:00Z",
    updated_at: "2026-03-12T08:30:00Z",
  },
  {
    id: "p3c4d5e6-f7a8-9012-cdef-123456789012",
    project_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    reference: "CHAP-01",
    description: "Chapa de ligação 20mm",
    material: "S275JR",
    wps: "WPS-002",
    quantity: 16,
    weight_kg: 45,
    estimated_hours: 2,
    status: "backlog",
    robot_id: null,
    scheduled_date: null,
    scheduled_period: null,
    urgent: false,
    barcode: null,
    program_id: null,
    position: 2,
    created_at: "2026-03-13T10:00:00Z",
    updated_at: "2026-03-13T10:00:00Z",
  },
  {
    id: "p4d5e6f7-a8b9-0123-defa-234567890123",
    project_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    reference: "BANC-01",
    description: "Bancada 2m aço inox 304",
    material: "AISI 304",
    wps: "WPS-003",
    quantity: 3,
    weight_kg: 85,
    estimated_hours: 6,
    status: "backlog",
    robot_id: null,
    scheduled_date: null,
    scheduled_period: null,
    urgent: false,
    barcode: "BANC01-001",
    program_id: null,
    position: 0,
    created_at: "2026-03-16T09:00:00Z",
    updated_at: "2026-03-16T09:00:00Z",
  },
];

// --- Mutable store (module-level singleton, resets on server restart) ---

let projects: Project[] = [...seedProjects];
let pieces: Piece[] = [...seedPieces];

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

// --- Project queries ---

export function getProjects(includeArchived = false): Project[] {
  if (includeArchived) return [...projects];
  return projects.filter((p) => p.status !== "archived");
}

export function getProjectById(id: string): Project | null {
  return projects.find((p) => p.id === id) ?? null;
}

export function getProjectByClientRef(clientRef: string): Project | null {
  return projects.find((p) => p.client_ref === clientRef) ?? null;
}

export function createProject(
  data: Omit<Project, "id" | "created_at" | "updated_at">
): Project {
  const project: Project = {
    ...data,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  };
  projects.push(project);
  return project;
}

export function updateProject(
  id: string,
  data: Partial<Omit<Project, "id" | "created_at" | "updated_at">>
): Project | null {
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], ...data, updated_at: now() };
  return projects[idx];
}

export function archiveProject(id: string): Project | null {
  return updateProject(id, { status: "archived" });
}

// --- Piece queries ---

export function getPiecesByProject(projectId: string): Piece[] {
  return pieces
    .filter((p) => p.project_id === projectId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function getPieceById(id: string): Piece | null {
  return pieces.find((p) => p.id === id) ?? null;
}

export function getPieceByReference(
  projectId: string,
  reference: string
): Piece | null {
  return (
    pieces.find(
      (p) => p.project_id === projectId && p.reference === reference
    ) ?? null
  );
}

export function createPiece(
  data: Omit<Piece, "id" | "created_at" | "updated_at">
): Piece {
  const piece: Piece = {
    ...data,
    id: generateId(),
    created_at: now(),
    updated_at: now(),
  };
  pieces.push(piece);
  return piece;
}

export function updatePiece(
  id: string,
  data: Partial<Omit<Piece, "id" | "project_id" | "created_at" | "updated_at">>
): Piece | null {
  const idx = pieces.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  pieces[idx] = { ...pieces[idx], ...data, updated_at: now() };
  return pieces[idx];
}

export function deletePiece(id: string): boolean {
  const idx = pieces.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  pieces.splice(idx, 1);
  return true;
}

export function getPieceCountByProject(projectId: string): number {
  return pieces.filter((p) => p.project_id === projectId).length;
}

/**
 * Returns a map of project_id -> piece count for all projects.
 */
export function getAllPieceCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of pieces) {
    counts.set(p.project_id, (counts.get(p.project_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Returns all pieces across all projects.
 */
export function getAllPieces(): Piece[] {
  return [...pieces];
}

/**
 * Moves a piece to a new status. Returns the updated piece or null if not found.
 */
export function movePiece(
  pieceId: string,
  newStatus: Piece["status"]
): Piece | null {
  const idx = pieces.findIndex((p) => p.id === pieceId);
  if (idx === -1) return null;
  pieces[idx] = { ...pieces[idx], status: newStatus, updated_at: now() };
  return pieces[idx];
}

// --- Allocation ---

/**
 * Allocates a piece to a robot on a specific date and period.
 * Sets status to 'allocated'.
 */
export function allocatePiece(
  pieceId: string,
  robotId: number,
  date: string,
  period: "AM" | "PM"
): Piece | null {
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
export function deallocatePiece(pieceId: string): Piece | null {
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
export function getRobotLoad(robotId: number, date: string): number {
  return pieces.filter(
    (p) => p.robot_id === robotId && p.scheduled_date === date
  ).length;
}

/**
 * Returns all pieces allocated to a specific robot.
 */
export function getPiecesByRobot(robotId: number): Piece[] {
  return pieces.filter((p) => p.robot_id === robotId);
}

// --- Program linking ---

export function linkProgram(pieceId: string, programId: string): Piece | null {
  return updatePiece(pieceId, { program_id: programId });
}

export function unlinkProgram(pieceId: string): Piece | null {
  return updatePiece(pieceId, { program_id: null });
}
