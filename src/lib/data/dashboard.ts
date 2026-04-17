/**
 * Dashboard data aggregation functions.
 * Server-side only — computes metrics from the in-memory store.
 */

import type { PieceStatus } from "@/lib/types";
import { getAllPieces, getProjects } from "@/lib/data/store";
import { getRobots } from "@/lib/data/programs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RobotOccupancyRow {
  robotId: number;
  robotName: string;
  occupiedSlots: number;
  availableSlots: number;
  totalSlots: number;
}

export interface PipelineCount {
  status: PieceStatus;
  label: string;
  count: number;
  color: string;
}

export interface DeadlineAlert {
  projectId: string;
  projectName: string;
  projectColor: string;
  clientRef: string;
  deadline: string;
  pendingPieces: number;
  daysRemaining: number;
  isOverdue: boolean;
}

export interface ThroughputWeek {
  weekLabel: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Robot Occupancy
// ---------------------------------------------------------------------------

function getDateRange(period: "week" | "month"): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === "week") {
    // Start of current week (Monday)
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    start.setDate(now.getDate() - diff);
    end.setDate(start.getDate() + 6); // Sunday
  } else {
    // Current month
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0); // Last day of month
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function countWorkdays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Computes robot occupancy for a given period.
 * Counts allocated/in_production pieces with scheduled dates in range.
 */
export async function getRobotOccupancyAsync(
  period: "week" | "month"
): Promise<RobotOccupancyRow[]> {
  const robots = await getRobots();
  const pieces = getAllPieces();
  const { start, end } = getDateRange(period);
  const workdays = countWorkdays(start, end);
  const totalSlotsPerRobot = workdays * 2;

  const occupiedByRobot = new Map<number, number>();

  for (const piece of pieces) {
    if (
      piece.robot_id != null &&
      piece.scheduled_date != null &&
      (piece.status === "allocated" || piece.status === "in_production")
    ) {
      const d = new Date(piece.scheduled_date);
      if (d >= start && d <= end) {
        occupiedByRobot.set(
          piece.robot_id,
          (occupiedByRobot.get(piece.robot_id) ?? 0) + 1
        );
      }
    }
  }

  return robots.map((robot) => {
    const occupied = occupiedByRobot.get(robot.id) ?? 0;
    return {
      robotId: robot.id,
      robotName: robot.name.replace("Robot ", "R"),
      occupiedSlots: occupied,
      availableSlots: Math.max(0, totalSlotsPerRobot - occupied),
      totalSlots: totalSlotsPerRobot,
    };
  });
}

// ---------------------------------------------------------------------------
// Pipeline Counters
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<PieceStatus, { label: string; color: string }> = {
  backlog: { label: "Backlog", color: "#3B82F6" },
  programmed: { label: "Programada", color: "#8B5CF6" },
  allocated: { label: "Alocada", color: "#F97316" },
  in_production: { label: "Em Produção", color: "#22C55E" },
  completed: { label: "Concluída", color: "#6B7280" },
};

export function getPipelineCounts(): PipelineCount[] {
  const pieces = getAllPieces();
  const counts = new Map<PieceStatus, number>();

  for (const piece of pieces) {
    counts.set(piece.status, (counts.get(piece.status) ?? 0) + 1);
  }

  const order: PieceStatus[] = [
    "backlog",
    "programmed",
    "allocated",
    "in_production",
    "completed",
  ];

  return order.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    count: counts.get(status) ?? 0,
    color: STATUS_CONFIG[status].color,
  }));
}

// ---------------------------------------------------------------------------
// Deadline Alerts
// ---------------------------------------------------------------------------

export function getDeadlineAlerts(daysAhead: number = 7): DeadlineAlert[] {
  const projects = getProjects();
  const pieces = getAllPieces();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const alerts: DeadlineAlert[] = [];

  for (const project of projects) {
    if (!project.deadline) continue;

    const deadline = new Date(project.deadline);
    deadline.setHours(0, 0, 0, 0);
    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Only show if within daysAhead window (or overdue)
    if (daysRemaining > daysAhead) continue;

    // Count uncompleted pieces for this project
    const pendingPieces = pieces.filter(
      (p) => p.project_id === project.id && p.status !== "completed"
    ).length;

    // Only alert if there are pending pieces
    if (pendingPieces === 0) continue;

    alerts.push({
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color,
      clientRef: project.client_ref,
      deadline: project.deadline,
      pendingPieces,
      daysRemaining,
      isOverdue: daysRemaining < 0,
    });
  }

  // Sort by deadline ascending (most urgent first)
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return alerts;
}

// ---------------------------------------------------------------------------
// Throughput (pieces completed per week)
// ---------------------------------------------------------------------------

export function getThroughput(weeks: number = 8): ThroughputWeek[] {
  const pieces = getAllPieces();
  const now = new Date();

  // Generate week boundaries going backwards
  const result: ThroughputWeek[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    // Count pieces that were completed (status = completed) and updated within this week
    const count = pieces.filter((p) => {
      if (p.status !== "completed") return false;
      const updated = new Date(p.updated_at);
      return updated >= weekStart && updated <= weekEnd;
    }).length;

    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    result.push({ weekLabel: label, count });
  }

  return result;
}
