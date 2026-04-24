import type { Project } from "@/lib/types";

interface Props {
  projects: Project[];
  counts: Map<string, number>;
}

/**
 * Legend mapping each project present in the range to its color swatch,
 * client_ref, name, and piece count.
 */
export function PrintLegend({ projects, counts }: Props) {
  if (projects.length === 0) {
    return (
      <div className="print-legend-empty">
        Sem projectos planeados no intervalo.
      </div>
    );
  }

  const sorted = [...projects].sort((a, b) =>
    a.client_ref.localeCompare(b.client_ref, "pt", { numeric: true }),
  );

  return (
    <div className="print-legend">
      {sorted.map((p) => (
        <div key={p.id} className="print-legend-item">
          <span
            className="print-legend-swatch"
            style={{ backgroundColor: p.color }}
          />
          <span className="print-legend-ref">{p.client_ref}</span>
          <span>{p.name}</span>
          <span className="print-legend-count">
            ({counts.get(p.id) ?? 0})
          </span>
        </div>
      ))}
    </div>
  );
}
