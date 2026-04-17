"use client";

interface KanbanFiltersProps {
  projectOptions: { id: string; name: string }[];
  robotOptions: { id: number; name: string }[];
  filterProject: string;
  filterRobot: string;
  filterUrgent: boolean;
  onProjectChange: (val: string) => void;
  onRobotChange: (val: string) => void;
  onUrgentChange: (val: boolean) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function KanbanFilters({
  projectOptions,
  robotOptions,
  filterProject,
  filterRobot,
  filterUrgent,
  onProjectChange,
  onRobotChange,
  onUrgentChange,
  onClear,
  hasFilters,
}: KanbanFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <select
        value={filterProject}
        onChange={(e) => onProjectChange(e.target.value)}
        className="text-sm border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-700 min-h-[44px]"
      >
        <option value="">Todos os projetos</option>
        {projectOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={filterRobot}
        onChange={(e) => onRobotChange(e.target.value)}
        className="text-sm border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-700 min-h-[44px]"
      >
        <option value="">Todos os robots</option>
        {robotOptions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onUrgentChange(!filterUrgent)}
        className={`text-sm px-3 py-2 rounded-lg border min-h-[44px] transition-colors ${
          filterUrgent
            ? "bg-red-50 border-red-300 text-red-700"
            : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        Urgentes
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-zinc-500 hover:text-zinc-700 underline min-h-[44px] px-2"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
