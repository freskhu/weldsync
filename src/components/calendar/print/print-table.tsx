import type { Piece, Project, Robot } from "@/lib/types";

interface Props {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<string, Project>;
}

function formatDayMT(
  isoDate: string | null,
  period: "morning" | "afternoon" | "AM" | "PM" | null,
): string {
  if (!isoDate) return "—";
  const [, m, d] = isoDate.split("-");
  const slot =
    period === "morning" || period === "AM"
      ? "M"
      : period === "afternoon" || period === "PM"
        ? "T"
        : "";
  return slot ? `${d}/${m} ${slot}` : `${d}/${m}`;
}

/**
 * Detail table of planned pieces.
 *
 * Prefers `planned_*` range columns (real planning intent). Falls back to
 * `scheduled_*` when only a hard allocation exists.
 */
export function PrintTable({ pieces, robots, projectMap }: Props) {
  if (pieces.length === 0) {
    return (
      <table className="print-table">
        <thead>
          <tr>
            <th className="col-robot">Robot</th>
            <th className="col-project">Projecto</th>
            <th className="col-piece">Peça</th>
            <th className="col-start">Início</th>
            <th className="col-end">Fim</th>
            <th className="col-material">Material / Peso</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="print-table-empty">
              Sem peças planeadas no intervalo.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  const robotNameById = new Map<number, string>();
  for (const r of robots) {
    robotNameById.set(r.id, r.name.split("—")[0].trim());
  }

  // Sort: robot name, then start date/period
  const sorted = [...pieces].sort((a, b) => {
    const rn = (robotNameById.get(a.robot_id!) ?? "").localeCompare(
      robotNameById.get(b.robot_id!) ?? "",
      "pt",
    );
    if (rn !== 0) return rn;

    const aStart = a.planned_start_date ?? a.scheduled_date ?? "";
    const bStart = b.planned_start_date ?? b.scheduled_date ?? "";
    if (aStart !== bStart) return aStart.localeCompare(bStart);

    const aPeriod = a.planned_start_period ?? a.scheduled_period ?? "";
    const bPeriod = b.planned_start_period ?? b.scheduled_period ?? "";
    return aPeriod.localeCompare(bPeriod);
  });

  return (
    <table className="print-table">
      <thead>
        <tr>
          <th className="col-robot">Robot</th>
          <th className="col-project">Projecto</th>
          <th className="col-piece">Peça</th>
          <th className="col-start">Início</th>
          <th className="col-end">Fim</th>
          <th className="col-material">Material / Peso</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((p) => {
          const proj = projectMap[p.project_id];
          const robotName = robotNameById.get(p.robot_id!) ?? "—";

          const startDate = p.planned_start_date ?? p.scheduled_date;
          const startPeriod = p.planned_start_period ?? p.scheduled_period;
          const endDate = p.planned_end_date ?? p.scheduled_date;
          const endPeriod = p.planned_end_period ?? p.scheduled_period;

          const material = [p.material, p.weight_kg ? `${p.weight_kg} kg` : null]
            .filter(Boolean)
            .join(" · ");

          return (
            <tr key={p.id}>
              <td>{robotName}</td>
              <td>
                <div className="print-table-project">
                  <span
                    className="print-table-swatch"
                    style={{ backgroundColor: proj?.color ?? "#6b7280" }}
                  />
                  <div>
                    <span className="print-table-mono">
                      {proj?.client_ref ?? "—"}
                    </span>
                    {proj?.name ? (
                      <>
                        {" "}
                        <span>· {proj.name}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="print-table-mono">{p.reference}</td>
              <td>{formatDayMT(startDate, startPeriod)}</td>
              <td>{formatDayMT(endDate, endPeriod)}</td>
              <td>{material || "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
