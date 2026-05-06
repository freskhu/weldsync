import { NextRequest, NextResponse } from "next/server";
import {
  getPieceById,
  backfillPlannedPriorities,
  getPlannedNeighbour,
  swapPlannedPriorities,
} from "@/lib/data/store";

/**
 * Replaces movePieceUpAction / movePieceDownAction.
 * POST /api/pieces/[id]/reorder { direction: 'up' | 'down' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { direction } = (await req.json()) as { direction?: "up" | "down" };

    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ ok: false, error: "invalid direction" }, { status: 400 });
    }

    let target = await getPieceById(id);
    if (!target) {
      return NextResponse.json({ ok: false, error: "piece not found" }, { status: 404 });
    }
    if (target.status !== "planned") {
      return NextResponse.json(
        { ok: false, error: "piece not in Planeados column" },
        { status: 400 }
      );
    }

    // First click on a priority-less piece: assign sequential priorities to
    // every planned piece in their current visual order, then proceed with
    // the swap. Without this we'd push the target to MAX+1 (the end) and the
    // visible move would be N slots instead of 1.
    if (target.priority == null) {
      await backfillPlannedPriorities();
      const refreshed = await getPieceById(id);
      if (!refreshed || refreshed.priority == null) {
        return NextResponse.json(
          { ok: false, error: "backfill did not assign priority" },
          { status: 500 }
        );
      }
      target = refreshed;
    }

    const neighbour = await getPlannedNeighbour(id, direction);
    if (!neighbour) {
      return NextResponse.json({ ok: true, boundary: true });
    }

    const swapped = await swapPlannedPriorities(target, neighbour);
    if (!swapped) {
      return NextResponse.json({ ok: false, error: "swap failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
