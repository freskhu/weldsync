import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgramById, getRobots, getTemplatePrograms } from "@/lib/data/programs";
import { ProgramDetailActions } from "@/components/programs/program-detail-actions";

interface ProgramDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { id } = await params;

  const [program, robots, templates] = await Promise.all([
    getProgramById(id),
    getRobots(),
    getTemplatePrograms(),
  ]);

  if (!program) notFound();

  const robot = program.robot_id
    ? robots.find((r) => r.id === program.robot_id)
    : null;

  const templateProgram = program.template_id
    ? templates.find((t) => t.id === program.template_id)
    : null;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/programs"
          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors min-h-[44px] inline-flex items-center"
        >
          &larr; Voltar aos programas
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <h1 className="text-2xl font-bold text-zinc-900">
            {program.piece_reference}
          </h1>
          <FileTypeBadge type={program.file_type} />
          {program.is_template && <TemplateBadge />}
        </div>
        {program.client_ref && (
          <p className="text-sm text-zinc-500">{program.client_ref}</p>
        )}
      </div>

      {/* Metadata grid */}
      <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100 mb-8">
        <MetadataRow label="Ficheiro" value={program.file_name} />
        <MetadataRow label="Tipo" value={`.${program.file_type}`} />
        <MetadataRow label="Robot" value={robot?.name ?? "Não atribuído"} />
        <MetadataRow
          label="Tempo de execução"
          value={
            program.execution_time_min != null
              ? `${program.execution_time_min} min`
              : "Não definido"
          }
        />
        <MetadataRow label="WPS" value={program.wps ?? "Não definido"} />
        <MetadataRow
          label="Template"
          value={
            program.is_template
              ? "Sim (este programa é um template)"
              : templateProgram
                ? `Baseado em: ${templateProgram.piece_reference}`
                : "Não"
          }
        />
        <MetadataRow
          label="Criado em"
          value={new Date(program.created_at).toLocaleDateString("pt-PT", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
      </div>

      {/* Notes */}
      {program.notes && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-900 mb-2">Notas</h2>
          <p className="text-sm text-zinc-600 whitespace-pre-wrap bg-zinc-50 border border-zinc-200 rounded-lg p-4">
            {program.notes}
          </p>
        </div>
      )}

      {/* Download placeholder */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Ficheiro</h2>
        <div className="flex items-center gap-3 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <span className="text-sm text-zinc-600">{program.file_name}</span>
          <a
            href={program.file_url}
            className="ml-auto px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] inline-flex items-center"
            download
          >
            Download
          </a>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Armazenamento local (mock). Em produção, usa Supabase Storage.
        </p>
      </div>

      {/* Actions */}
      <ProgramDetailActions
        program={program}
        robots={robots}
        templates={templates}
      />
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3">
      <span className="text-sm text-zinc-500 mb-0.5 sm:mb-0">{label}</span>
      <span className="text-sm font-medium text-zinc-900 sm:text-right truncate">
        {value}
      </span>
    </div>
  );
}

function FileTypeBadge({ type }: { type: "tp" | "ls" }) {
  const colors =
    type === "tp"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold rounded border ${colors}`}
    >
      .{type}
    </span>
  );
}

function TemplateBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
      Template
    </span>
  );
}
