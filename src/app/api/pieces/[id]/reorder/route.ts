import { NextRequest, NextResponse } from "next/server";
import {
  getPieceById,
  updatePiece,
  nextPlannedPriority,
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

    const target = await getPieceById(id);
    if (!target) {
      return NextResponse.json({ ok: false, error: "piece not found" }, { status: 404 });
    }
    if (target.status !== "planned") {
      return NextResponse.json(
        { ok: false, error: "piece not in Planeados column" },
        { status: 400 }
      );
    }

    if (target.priority == null) {
      const next = await nextPlannedPriority();
      await updatePiece(id, { priority: next });
      return NextResponse.json({ ok: true, backfilled: next });
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
