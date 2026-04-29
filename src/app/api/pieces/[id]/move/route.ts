import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId, logAudit } from "@/lib/audit";
import {
  getPieceById,
  updatePiece,
  nextPlannedPriority,
  PieceOverlapError,
} from "@/lib/data/store";
import type { PieceStatus } from "@/lib/types";

const VALID: PieceStatus[] = [
  "backlog",
  "planned",
  "programmed",
  "allocated",
  "in_production",
  "completed",
];

/**
 * Replaces movePieceAction. Same semantics: status transition with
 * audit fields + priority lifecycle for "planned" entry/exit.
 *
 * REST workaround: Server Action flow is throwing 500 with masked
 * digest in this Next.js 16 build for reasons we haven't isolated yet.
 * Plain Route Handler avoids the Server Action machinery entirely.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { status?: string };
    const newStatus = body.status as PieceStatus | undefined;

    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    if (!newStatus || !VALID.includes(newStatus)) {
      return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });
    }

    const before = await getPieceById(id);
    if (!before) {
      return NextResponse.json({ ok: false, error: "piece not found" }, { status: 404 });
    }

    const supabase = await createClient();
    const userId = await getCurrentUserId(supabase);

    const patch: Parameters<typeof updatePiece>[1] = {
      status: newStatus,
      last_status_change_by: userId,
      last_status_change_at: new Date().toISOString(),
    };

    if (before.status === "planned" && newStatus !== "planned") {
      patch.priority = null;
    }
    if (before.status !== "planned" && newStatus === "planned") {
      patch.priority = await nextPlannedPriority();
    }

    if (newStatus === "completed") {
      patch.planned_start_date = null;
      patch.planned_end_date = null;
      patch.planned_start_period = null;
      patch.planned_end_period = null;
      patch.robot_id = null;
      patch.scheduled_date = null;
      patch.scheduled_period = null;
    }

    if (before.status === "allocated" && newStatus !== "allocated") {
      patch.scheduled_date = null;
      patch.scheduled_period = null;
      if (newStatus === "backlog" || newStatus === "planned") {
        patch.robot_id = null;
      }
    }

    let piece;
    try {
      piece = await updatePiece(id, patch);
    } catch (err) {
      if (err instanceof PieceOverlapError) {
        return NextResponse.json(
          { ok: false, error: "Esta peça sobrepõe-se a outra já planeada no mesmo robot." },
          { status: 409 }
        );
      }
      throw err;
    }
    if (!piece) {
      return NextResponse.json({ ok: false, error: "piece not found" }, { status: 404 });
    }

    await logAudit(supabase, "UPDATE", "piece", id, before, piece);

    return NextResponse.json({ ok: true, piece });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
