/**
 * Core domain types for WeldSync.
 * These match the database schema defined in supabase/migrations/.
 */

export type ProjectStatus = "active" | "completed" | "archived";
export type PieceStatus =
  | "backlog"
  | "programmed"
  | "allocated"
  | "in_production"
  | "completed";
export type SchedulePeriod = "AM" | "PM";
export type ProgramFileType = "tp" | "ls";

export interface Robot {
  id: number;
  name: string;
  description: string | null;
  capacity_kg: number;
  setup_type: string;
  capabilities: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_ref: string;
  name: string;
  client_name: string;
  color: string;
  deadline: string | null;
  /** Project planning window start (ISO YYYY-MM-DD). Paired with end_date. */
  start_date: string | null;
  /** Project planning window end (ISO YYYY-MM-DD). Paired with start_date. */
  end_date: string | null;
  status: ProjectStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Piece {
  id: string;
  project_id: string;
  reference: string;
  description: string | null;
  material: string | null;
  wps: string | null;
  quantity: number;
  weight_kg: number | null;
  estimated_hours: number | null;
  status: PieceStatus;
  robot_id: number | null;
  scheduled_date: string | null;
  scheduled_period: SchedulePeriod | null;
  /** Planned range start (ISO YYYY-MM-DD). Paired with planned_end_date. */
  planned_start_date: string | null;
  /** Planned range end (ISO YYYY-MM-DD). Paired with planned_start_date. */
  planned_end_date: string | null;
  urgent: boolean;
  barcode: string | null;
  program_id: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  piece_reference: string;
  client_ref: string | null;
  is_template: boolean;
  template_id: string | null;
  robot_id: number | null;
  file_type: ProgramFileType;
  file_url: string;
  file_name: string;
  execution_time_min: number | null;
  wps: string | null;
  notes: string | null;
  created_at: string;
}

export interface PlanningWindow {
  id: string;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string;   // ISO date string (YYYY-MM-DD)
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
