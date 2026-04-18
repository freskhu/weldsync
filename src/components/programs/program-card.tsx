import Link from "next/link";
import type { Program, Robot } from "@/lib/types";

interface ProgramCardProps {
  program: Program;
  robot?: Robot;
  templateName?: string;
}

export function ProgramCard({ program, robot, templateName }: ProgramCardProps) {
  return (
    <Link
      href={`/programs/${program.id}`}
      className="block bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all min-h-[44px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-zinc-900 truncate">
              {program.piece_reference}
            </h3>
            <FileTypeBadge type={program.file_type} />
            {program.is_template && <TemplateBadge />}
          </div>

          {program.client_ref && (
            <p className="text-xs text-zinc-500 mt-1">{program.client_ref}</p>
          )}

          <p className="text-xs text-zinc-400 mt-1 truncate">{program.file_name}</p>
        </div>

        <div className="text-right shrink-0">
          {program.execution_time_min != null && (
            <p className="text-xs text-zinc-600 font-medium">
              {program.execution_time_min} min
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-100">
        {robot && (
          <span className="text-xs text-zinc-500 truncate">{robot.name}</span>
        )}
        {templateName && (
          <span className="text-xs text-zinc-400 truncate ml-auto">
            Template: {templateName}
          </span>
        )}
      </div>
    </Link>
  );
}

function FileTypeBadge({ type }: { type: "tp" | "ls" }) {
  const colors =
    type === "tp"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-green-50 text-green-700 border-green-200";

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border ${colors}`}
    >
      .{type}
    </span>
  );
}

function TemplateBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border bg-purple-50 text-purple-700 border-purple-200">
      Template
    </span>
  );
}
