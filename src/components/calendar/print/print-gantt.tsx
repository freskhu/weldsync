import type { Piece, Project, Robot } from "@/lib/types";

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
 * Rows = robots, columns = days (each day has AM/PM sub-slots).
 * Blocks use the project color with a diagonal-stripe overlay so the blocks
 * stay distinguishable when printed in greyscale.
 */
export function PrintGantt({ robots, days, pieces, projectMap }: Props) {
  // Index pieces by robot/date/period
  const cell = new Map<string, Piece[]>();
  for (const p of pieces) {
    if (!p.robot_id || !p.scheduled_date || !p.scheduled_period) continue;
    const key = `${p.robot_id}|${p.scheduled_date}|${p.scheduled_period}`;
    const arr = cell.get(key) ?? [];
    arr.push(p);
    cell.set(key, arr);
  }

  return (
    <table className="print-gantt">
      <thead>
        <tr>
          <th className="print-gantt-robot-col">Robot</th>
          {days.map((d) => {
            const weekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
            return (
              <th
                key={d.date}
                className={
                  "print-gantt-day" +
                  (weekend ? " print-gantt-day-weekend" : "")
                }
              >
                {d.display}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {robots.map((robot) => {
          const robotShortName = robot.name.split("—")[0].trim();
          return (
            <tr key={robot.id}>
              <td className="print-gantt-robot-cell">
                <span className="print-gantt-robot-name">{robotShortName}</span>
                <span className="print-gantt-robot-capacity">
                  {(robot.capacity_kg / 1000).toFixed(0)}t
                </span>
              </td>
              {days.map((d) => {
                const weekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
                const amKey = `${robot.id}|${d.date}|AM`;
                const pmKey = `${robot.id}|${d.date}|PM`;
                const amPieces = cell.get(amKey) ?? [];
                const pmPieces = cell.get(pmKey) ?? [];
                return (
                  <td
                    key={d.date}
                    className={
                      "print-gantt-cell" +
                      (weekend ? " print-gantt-day-weekend" : "")
                    }
                  >
                    <div className="print-gantt-slot">
                      <span className="print-gantt-slot-label">M</span>
                      {amPieces.map((p) => {
                        const proj = projectMap[p.project_id];
                        return (
                          <div
                            key={p.id}
                            className="print-gantt-block"
                            style={{ backgroundColor: proj?.color ?? "#6b7280" }}
                          >
                            <span className="print-gantt-block-ref">
                              {p.reference}
                            </span>
                            {proj ? (
                              <span className="print-gantt-block-client">
                                {proj.client_ref}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className="print-gantt-slot">
                      <span className="print-gantt-slot-label">T</span>
                      {pmPieces.map((p) => {
                        const proj = projectMap[p.project_id];
                        return (
                          <div
                            key={p.id}
                            className="print-gantt-block"
                            style={{ backgroundColor: proj?.color ?? "#6b7280" }}
                          >
                            <span className="print-gantt-block-ref">
                              {p.reference}
                            </span>
                            {proj ? (
                              <span className="print-gantt-block-client">
                                {proj.client_ref}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
