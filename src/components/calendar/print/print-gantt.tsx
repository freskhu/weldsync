import type { Piece, PiecePeriod, Project, Robot } from "@/lib/types";

interface Day {
  date: string;
  display: string;
  dayOfWeek: number;
}

interface Props {
  robots: Robot[];
  days: Day[];
  pieces: Piece[];
  projectMap: Record<string, Project>;
}

/**
 * Compact Gantt for the printed page.
 *
 * Rows = robots, columns = days (each day split into AM/PM sub-slots).
 * Each piece renders as ONE contiguous block spanning every half-day slot
 * between its planned start and planned end. Data source is
 * `planned_start_date`/`planned_start_period` → `planned_end_date`/
 * `planned_end_period`, falling back to the legacy `scheduled_date` +
 * `scheduled_period` pair for older pieces that never got a range.
 *
 * Blocks use the project color with a diagonal-stripe overlay so they remain
 * distinguishable when printed in greyscale. Blocks that overlap in time on
 * the same robot stack vertically (defensive — exclusion constraint should
 * prevent this in practice).
 */

// --- layout constants -----------------------------------------------------
// Expressed as flex fractions; the Gantt body is a single flex row per robot
// with `SLOTS_PER_DAY * days.length` equally-sized columns.
const SLOTS_PER_DAY = 2;
const ROBOT_ROW_MIN_HEIGHT_MM = 12;
const LANE_HEIGHT_MM = 4.6;
const LANE_GAP_MM = 0.4;
const ROW_PADDING_MM = 0.8;

// --- helpers --------------------------------------------------------------

function periodToOffset(period: PiecePeriod | "AM" | "PM" | null): 0 | 1 {
  // morning/AM → 0, afternoon/PM → 1
  if (period === "afternoon" || period === "PM") return 1;
  return 0;
}

function daysBetween(fromISO: string, toISO: string): number {
  // Both are YYYY-MM-DD; use UTC to avoid DST drift.
  const a = Date.UTC(
    +fromISO.slice(0, 4),
    +fromISO.slice(5, 7) - 1,
    +fromISO.slice(8, 10),
  );
  const b = Date.UTC(
    +toISO.slice(0, 4),
    +toISO.slice(5, 7) - 1,
    +toISO.slice(8, 10),
  );
  return Math.round((b - a) / 86_400_000);
}

interface Span {
  piece: Piece;
  project: Project | undefined;
  /** Inclusive slot ordinal relative to the window start (0 == window start AM). */
  startOrdinal: number;
  /** Inclusive slot ordinal relative to the window start. */
  endOrdinal: number;
  /** True if the underlying range starts before the visible window. */
  clampedLeft: boolean;
  /** True if the underlying range ends after the visible window. */
  clampedRight: boolean;
}

/**
 * Resolve each piece into a Span clamped to the visible window.
 * Uses planned_* when available, else falls back to scheduled_*.
 * Returns null when the piece falls entirely outside the window.
 */
function pieceToSpan(
  piece: Piece,
  project: Project | undefined,
  windowStartISO: string,
  windowEndISO: string,
  totalSlots: number,
): Span | null {
  let startDate: string | null = null;
  let endDate: string | null = null;
  let startPeriod: PiecePeriod | "AM" | "PM" | null = null;
  let endPeriod: PiecePeriod | "AM" | "PM" | null = null;

  if (piece.planned_start_date && piece.planned_end_date) {
    startDate = piece.planned_start_date;
    endDate = piece.planned_end_date;
    startPeriod = piece.planned_start_period ?? "morning";
    endPeriod = piece.planned_end_period ?? "afternoon";
  } else if (piece.scheduled_date) {
    // Legacy single-slot allocation.
    startDate = piece.scheduled_date;
    endDate = piece.scheduled_date;
    startPeriod = piece.scheduled_period ?? "AM";
    endPeriod = piece.scheduled_period ?? "AM";
  } else {
    return null;
  }

  // Compute raw ordinals against the window start.
  const startDayDelta = daysBetween(windowStartISO, startDate);
  const endDayDelta = daysBetween(windowStartISO, endDate);

  let startOrdinal = startDayDelta * SLOTS_PER_DAY + periodToOffset(startPeriod);
  let endOrdinal = endDayDelta * SLOTS_PER_DAY + periodToOffset(endPeriod);

  // Guard against inverted ranges (bad data).
  if (endOrdinal < startOrdinal) endOrdinal = startOrdinal;

  // Entirely outside window.
  if (endOrdinal < 0) return null;
  if (startOrdinal >= totalSlots) return null;

  const clampedLeft = startOrdinal < 0;
  const clampedRight = endOrdinal >= totalSlots;
  if (clampedLeft) startOrdinal = 0;
  if (clampedRight) endOrdinal = totalSlots - 1;

  // Ignore pieces whose end crosses into the window tail but collapse to <0 width.
  if (endOrdinal < startOrdinal) return null;

  // Secondary sanity check: if the original range was entirely in the
  // future/past of the window, drop it.
  const windowStartDelta = daysBetween(windowStartISO, windowStartISO);
  const windowEndDelta = daysBetween(windowStartISO, windowEndISO);
  if (
    endDayDelta < windowStartDelta ||
    startDayDelta > windowEndDelta
  ) {
    // Fully outside — but we already guarded via ordinals. Keep as belt & braces.
    return null;
  }

  return {
    piece,
    project,
    startOrdinal,
    endOrdinal,
    clampedLeft,
    clampedRight,
  };
}

/**
 * Greedy lane packing: place each span on the first lane where it doesn't
 * overlap an earlier span. Returns { lane, laneCount }.
 */
function assignLanes(spans: Span[]): { spans: (Span & { lane: number })[]; laneCount: number } {
  // Sort by start so lane assignment is stable left-to-right.
  const sorted = [...spans].sort(
    (a, b) => a.startOrdinal - b.startOrdinal || a.endOrdinal - b.endOrdinal,
  );
  // lanes[i] = highest endOrdinal currently occupying lane i.
  const lanes: number[] = [];
  const placed: (Span & { lane: number })[] = [];
  for (const s of sorted) {
    let assigned = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] < s.startOrdinal) {
        assigned = i;
        break;
      }
    }
    if (assigned === -1) {
      assigned = lanes.length;
      lanes.push(s.endOrdinal);
    } else {
      lanes[assigned] = s.endOrdinal;
    }
    placed.push({ ...s, lane: assigned });
  }
  return { spans: placed, laneCount: Math.max(1, lanes.length) };
}

export function PrintGantt({ robots, days, pieces, projectMap }: Props) {
  if (days.length === 0) return null;

  const windowStartISO = days[0].date;
  const windowEndISO = days[days.length - 1].date;
  const totalSlots = days.length * SLOTS_PER_DAY;

  // Pre-compute spans per robot.
  const spansByRobot = new Map<number, Span[]>();
  for (const piece of pieces) {
    if (!piece.robot_id) continue;
    const project = projectMap[piece.project_id];
    const span = pieceToSpan(
      piece,
      project,
      windowStartISO,
      windowEndISO,
      totalSlots,
    );
    if (!span) continue;
    const arr = spansByRobot.get(piece.robot_id) ?? [];
    arr.push(span);
    spansByRobot.set(piece.robot_id, arr);
  }

  return (
    <div className="print-gantt">
      {/* Header: one cell per day, each with M/T sub-labels */}
      <div className="print-gantt-header">
        <div className="print-gantt-robot-col print-gantt-header-robot">Robot</div>
        <div className="print-gantt-days-header">
          {days.map((d) => {
            const weekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
            return (
              <div
                key={d.date}
                className={
                  "print-gantt-day-header" +
                  (weekend ? " print-gantt-day-weekend" : "")
                }
              >
                <span className="print-gantt-day-label">{d.display}</span>
                <span className="print-gantt-day-subslots">
                  <span>M</span>
                  <span>T</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* One row per robot */}
      <div className="print-gantt-body">
        {robots.map((robot) => {
          const robotShortName = robot.name.split("—")[0].trim();
          const spans = spansByRobot.get(robot.id) ?? [];
          const { spans: laned, laneCount } = assignLanes(spans);

          const rowHeightMm = Math.max(
            ROBOT_ROW_MIN_HEIGHT_MM,
            ROW_PADDING_MM * 2 +
              laneCount * LANE_HEIGHT_MM +
              Math.max(0, laneCount - 1) * LANE_GAP_MM,
          );

          return (
            <div
              key={robot.id}
              className="print-gantt-row"
              style={{ minHeight: `${rowHeightMm}mm` }}
            >
              <div className="print-gantt-robot-cell">
                <span className="print-gantt-robot-name">{robotShortName}</span>
                <span className="print-gantt-robot-capacity">
                  {(robot.capacity_kg / 1000).toFixed(0)}t
                </span>
              </div>
              <div
                className="print-gantt-lane-area"
                style={{
                  // Expose total slot count so CSS grid backgrounds line up.
                  ["--slot-count" as string]: String(totalSlots),
                  ["--day-count" as string]: String(days.length),
                }}
              >
                {/* Background: day columns with weekend shading + slot separators */}
                <div className="print-gantt-grid" aria-hidden>
                  {days.map((d) => {
                    const weekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
                    return (
                      <div
                        key={d.date}
                        className={
                          "print-gantt-grid-day" +
                          (weekend ? " print-gantt-day-weekend" : "")
                        }
                      >
                        <div className="print-gantt-grid-slot" />
                        <div className="print-gantt-grid-slot" />
                      </div>
                    );
                  })}
                </div>

                {/* Foreground: absolutely-positioned piece blocks */}
                {laned.map((s) => {
                  const proj = s.project;
                  const slotSpan = s.endOrdinal - s.startOrdinal + 1;
                  const leftPct = (s.startOrdinal / totalSlots) * 100;
                  const widthPct = (slotSpan / totalSlots) * 100;
                  const topMm =
                    ROW_PADDING_MM +
                    s.lane * (LANE_HEIGHT_MM + LANE_GAP_MM);
                  const showText = slotSpan >= 2;
                  const clientRef = proj?.client_ref ?? "";
                  const label = clientRef
                    ? `${clientRef} · ${s.piece.reference}`
                    : s.piece.reference;
                  const title = [
                    clientRef,
                    s.piece.reference,
                    s.piece.description ?? "",
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  const classes = [
                    "print-gantt-block",
                    s.clampedLeft ? "print-gantt-block-clamp-left" : "",
                    s.clampedRight ? "print-gantt-block-clamp-right" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div
                      key={s.piece.id}
                      className={classes}
                      title={title}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: `${topMm}mm`,
                        height: `${LANE_HEIGHT_MM}mm`,
                        backgroundColor: proj?.color ?? "#6b7280",
                      }}
                    >
                      {showText ? (
                        <span className="print-gantt-block-label">{label}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
