/**
 * Data access layer for Programs.
 *
 * Currently backed by in-memory mock data.
 * When Supabase is connected, swap implementations here — callers stay unchanged.
 */

import type { Program, Robot } from "@/lib/types";
import type { ProgramCreateInput, ProgramUpdateInput } from "@/lib/validations/program";

// ---------------------------------------------------------------------------
// Mock robots (matches seed data from 00004_seed_robots.sql)
// ---------------------------------------------------------------------------

const MOCK_ROBOTS: Robot[] = [
  {
    id: 1,
    name: "Robot 1 — Posicionador 7t",
    description: "Posicionador com capacidade de 7 toneladas",
    capacity_kg: 7000,
    setup_type: "posicionador",
    capabilities: ["posicionador"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Robot 2 — Coluna + Posicionador 15t",
    description: "Coluna com posicionador, capacidade de 15 toneladas",
    capacity_kg: 15000,
    setup_type: "coluna_posicionador",
    capabilities: ["coluna", "posicionador"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Robot 3 — Coluna + Posicionador 15t",
    description: "Coluna com posicionador, capacidade de 15 toneladas",
    capacity_kg: 15000,
    setup_type: "coluna_posicionador",
    capabilities: ["coluna", "posicionador"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Robot 4 — Monobloco 2 Áreas 1t",
    description: "Monobloco com 2 áreas de trabalho, capacidade de 1 tonelada",
    capacity_kg: 1000,
    setup_type: "monobloco",
    capabilities: ["monobloco", "2_areas"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 5,
    name: "Robot 5 — Mesa Rotativa 10t",
    description: "Mesa rotativa com capacidade de 10 toneladas",
    capacity_kg: 10000,
    setup_type: "mesa_rotativa",
    capabilities: ["mesa_rotativa"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Mock programs store (in-memory, resets on server restart)
// ---------------------------------------------------------------------------

let mockPrograms: Program[] = [
  {
    id: "p1-aaa-bbb-ccc",
    piece_reference: "CURV-2025-001",
    client_ref: "CLI-TEKEVER-001",
    is_template: true,
    template_id: null,
    robot_id: 1,
    file_type: "tp",
    file_url: "/mock/CURV-2025-001.tp",
    file_name: "CURV-2025-001.tp",
    execution_time_min: 45,
    wps: "WPS-135-MAG",
    notes: "Template base para peças TEKEVER — perfil tubular",
    created_at: "2025-03-10T08:00:00Z",
  },
  {
    id: "p2-ddd-eee-fff",
    piece_reference: "CURV-2025-002",
    client_ref: "CLI-TEKEVER-002",
    is_template: false,
    template_id: "p1-aaa-bbb-ccc",
    robot_id: 1,
    file_type: "tp",
    file_url: "/mock/CURV-2025-002.tp",
    file_name: "CURV-2025-002.tp",
    execution_time_min: 52,
    wps: "WPS-135-MAG",
    notes: "Variante da template para lote #2",
    created_at: "2025-03-12T10:30:00Z",
  },
  {
    id: "p3-ggg-hhh-iii",
    piece_reference: "CURV-2025-010",
    client_ref: "CLI-EFACEC-001",
    is_template: false,
    template_id: null,
    robot_id: 2,
    file_type: "ls",
    file_url: "/mock/CURV-2025-010.ls",
    file_name: "CURV-2025-010.ls",
    execution_time_min: 120,
    wps: "WPS-141-TIG",
    notes: "Programa para chassis EFACEC — soldadura TIG",
    created_at: "2025-03-15T14:00:00Z",
  },
  {
    id: "p4-jjj-kkk-lll",
    piece_reference: "CURV-2025-015",
    client_ref: "CLI-MARTIFER-001",
    is_template: true,
    template_id: null,
    robot_id: 3,
    file_type: "tp",
    file_url: "/mock/CURV-2025-015.tp",
    file_name: "CURV-2025-015.tp",
    execution_time_min: 90,
    wps: "WPS-135-MAG",
    notes: "Template para estruturas Martifer — vigas HEB",
    created_at: "2025-04-01T09:00:00Z",
  },
  {
    id: "p5-mmm-nnn-ooo",
    piece_reference: "CURV-2025-020",
    client_ref: null,
    is_template: true,
    template_id: null,
    robot_id: 5,
    file_type: "ls",
    file_url: "/mock/CURV-2025-020.ls",
    file_name: "CURV-2025-020.ls",
    execution_time_min: 30,
    wps: "WPS-135-MAG",
    notes: "Template genérica — mesa rotativa, peças pequenas",
    created_at: "2025-04-05T11:00:00Z",
  },
  {
    id: "p6-ppp-qqq-rrr",
    piece_reference: "CURV-2025-021",
    client_ref: "CLI-EFACEC-002",
    is_template: false,
    template_id: null,
    robot_id: 4,
    file_type: "tp",
    file_url: "/mock/CURV-2025-021.tp",
    file_name: "CURV-2025-021.tp",
    execution_time_min: 65,
    wps: "WPS-141-TIG",
    notes: null,
    created_at: "2025-04-10T16:30:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID();
}

function matchesSearch(program: Program, query: string): boolean {
  const q = query.toLowerCase();
  return (
    program.piece_reference.toLowerCase().includes(q) ||
    (program.client_ref?.toLowerCase().includes(q) ?? false) ||
    (program.notes?.toLowerCase().includes(q) ?? false) ||
    program.file_name.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ProgramFilters {
  search?: string;
  client_ref?: string;
  robot_id?: number;
  is_template?: boolean;
}

export async function getPrograms(filters?: ProgramFilters): Promise<Program[]> {
  let results = [...mockPrograms];

  if (filters?.search) {
    results = results.filter((p) => matchesSearch(p, filters.search!));
  }
  if (filters?.client_ref) {
    results = results.filter((p) => p.client_ref === filters.client_ref);
  }
  if (filters?.robot_id !== undefined && filters.robot_id !== null) {
    results = results.filter((p) => p.robot_id === filters.robot_id);
  }
  if (filters?.is_template !== undefined) {
    results = results.filter((p) => p.is_template === filters.is_template);
  }

  // Most recent first
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return results;
}

export async function getProgramById(id: string): Promise<Program | null> {
  return mockPrograms.find((p) => p.id === id) ?? null;
}

export async function getTemplatePrograms(): Promise<Program[]> {
  return mockPrograms.filter((p) => p.is_template);
}

export async function createProgram(
  input: ProgramCreateInput,
  fileUrl: string
): Promise<Program> {
  const program: Program = {
    id: generateId(),
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
    created_at: new Date().toISOString(),
  };

  mockPrograms.unshift(program);
  return program;
}

export async function updateProgram(
  id: string,
  input: ProgramUpdateInput
): Promise<Program | null> {
  const index = mockPrograms.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const existing = mockPrograms[index];
  const updated: Program = {
    ...existing,
    piece_reference: input.piece_reference ?? existing.piece_reference,
    client_ref: input.client_ref !== undefined ? (input.client_ref ?? null) : existing.client_ref,
    is_template: input.is_template ?? existing.is_template,
    template_id:
      input.template_id !== undefined ? (input.template_id ?? null) : existing.template_id,
    robot_id: input.robot_id !== undefined ? (input.robot_id ?? null) : existing.robot_id,
    execution_time_min:
      input.execution_time_min !== undefined
        ? (input.execution_time_min ?? null)
        : existing.execution_time_min,
    wps: input.wps !== undefined ? (input.wps ?? null) : existing.wps,
    notes: input.notes !== undefined ? (input.notes ?? null) : existing.notes,
  };

  mockPrograms[index] = updated;
  return updated;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const before = mockPrograms.length;
  mockPrograms = mockPrograms.filter((p) => p.id !== id);

  // Unlink any programs that referenced this as template
  mockPrograms = mockPrograms.map((p) =>
    p.template_id === id ? { ...p, template_id: null } : p
  );

  return mockPrograms.length < before;
}

export async function getRobots(): Promise<Robot[]> {
  return MOCK_ROBOTS;
}

/** Get unique client refs from existing programs */
export async function getUniqueClientRefs(): Promise<string[]> {
  const refs = new Set<string>();
  for (const p of mockPrograms) {
    if (p.client_ref) refs.add(p.client_ref);
  }
  return Array.from(refs).sort();
}
