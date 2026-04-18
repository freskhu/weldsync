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
    <div className="flex flex-wrap items-center gap-2.5 mb-5 bg-[var(--color-surface-card)] rounded-xl px-4 py-3 shadow-[var(--shadow-xs)]">
      <select
        value={filterProject}
        onChange={(e) => onProjectChange(e.target.value)}
        className="text-sm border border-zinc-200 rounded-full px-3.5 py-2 bg-white text-zinc-700 min-h-[44px] focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:outline-none transition-all duration-150 hover:border-zinc-300"
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
        className="text-sm border border-zinc-200 rounded-full px-3.5 py-2 bg-white text-zinc-700 min-h-[44px] focus:ring-2 focus:ring-[var(--color-brand-500)]/30 focus:outline-none transition-all duration-150 hover:border-zinc-300"
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
        className={`text-sm px-4 py-2 rounded-full border min-h-[44px] transition-all duration-150 font-medium ${
          filterUrgent
            ? "bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger-text)] shadow-sm"
            : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495z" clipRule="evenodd" />
          </svg>
          Urgentes
        </span>
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-zinc-500 hover:text-zinc-700 font-medium min-h-[44px] px-3 py-2 rounded-full hover:bg-zinc-100 transition-all duration-150"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
