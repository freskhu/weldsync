import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPieceById, updatePiece, nextPlannedPriority } from "@/lib/data/store";
import { getCurrentUserId } from "@/lib/audit";

/**
 * Debug-only endpoint to bypass Server Action error masking.
 *
 * GET /api/debug/move-piece?id=PIECE_UUID&status=planned
 *
 * Returns full error message + stack so we can see what's failing
 * during the Backlog→Planeados drag without Next.js mask.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const status = req.nextUrl.searchParams.get("status");

  if (!id || !status) {
    return NextResponse.json(
      { ok: false, error: "missing id or status" },
      { status: 400 }
    );
  }

  const trace: string[] = [];
  try {
    trace.push("step 1: createClient");
    const supabase = await createClient();

    trace.push("step 2: getCurrentUserId");
    const userId = await getCurrentUserId(supabase);
    trace.push(`  userId=${userId ?? "null"}`);

    trace.push("step 3: getPieceById");
    const before = await getPieceById(id);
    if (!before) {
      return NextResponse.json({ ok: false, error: "piece not found", trace });
    }
    trace.push(`  before.status=${before.status} before.priority=${before.priority}`);

    let priority: number | null = null;
    if (before.status !== "planned" && status === "planned") {
      trace.push("step 4: nextPlannedPriority");
      priority = await nextPlannedPriority();
      trace.push(`  priority=${priority}`);
    }

    trace.push("step 5: updatePiece");
    const updated = await updatePiece(id, {
      status: status as never,
      last_status_change_by: userId,
      last_status_change_at: new Date().toISOString(),
      ...(priority !== null ? { priority } : {}),
    });
    trace.push(`  updated.id=${updated?.id ?? "null"}`);

    return NextResponse.json({
      ok: true,
      trace,
      before,
      after: updated,
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      {
        ok: false,
        error: e.message,
        name: e.name,
        stack: e.stack,
        cause: e.cause ? String(e.cause) : undefined,
        trace,
      },
      { status: 500 }
    );
  }
}
