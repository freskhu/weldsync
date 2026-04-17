import { Suspense } from "react";
import { getPrograms, getRobots, getTemplatePrograms, getUniqueClientRefs } from "@/lib/data/programs";
import { ProgramCard } from "@/components/programs/program-card";
import { ProgramFilters } from "@/components/programs/program-filters";
import { UploadButton } from "@/components/programs/upload-button";
import type { ProgramFilters as ProgramFiltersType } from "@/lib/data/programs";

interface ProgramsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  const params = await searchParams;

  const filters: ProgramFiltersType = {};
  if (typeof params.search === "string" && params.search) {
    filters.search = params.search;
  }
  if (typeof params.client_ref === "string" && params.client_ref) {
    filters.client_ref = params.client_ref;
  }
  if (typeof params.robot_id === "string" && params.robot_id) {
    filters.robot_id = Number(params.robot_id);
  }
  if (typeof params.type === "string") {
    if (params.type === "template") filters.is_template = true;
    if (params.type === "specific") filters.is_template = false;
  }

  const [programs, robots, templates, clientRefs] = await Promise.all([
    getPrograms(filters),
    getRobots(),
    getTemplatePrograms(),
    getUniqueClientRefs(),
  ]);

  // Build lookup maps for cards
  const robotMap = new Map(robots.map((r) => [r.id, r]));
  const programMap = new Map(programs.map((p) => [p.id, p]));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Programas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {programs.length} programa{programs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <UploadButton robots={robots} templates={templates} />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Suspense fallback={null}>
          <ProgramFilters robots={robots} clientRefs={clientRefs} />
        </Suspense>
      </div>

      {/* Program grid */}
      {programs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-400 text-sm">Nenhum programa encontrado.</p>
          {filters.search && (
            <p className="text-zinc-400 text-xs mt-1">
              Tenta pesquisar com outros termos.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => {
            const robot = program.robot_id
              ? robotMap.get(program.robot_id)
              : undefined;
            const templateProgram = program.template_id
              ? programMap.get(program.template_id)
              : undefined;

            return (
              <ProgramCard
                key={program.id}
                program={program}
                robot={robot}
                templateName={templateProgram?.piece_reference}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
