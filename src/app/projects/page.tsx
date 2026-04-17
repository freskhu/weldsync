import { getProjects, getAllPieceCounts } from "@/lib/data/store";
import { ProjectList } from "@/components/projects/project-list";

export default function ProjectsPage() {
  const projects = getProjects();
  const pieceCountsMap = getAllPieceCounts();

  // Convert Map to plain object for serialization to client component
  const pieceCounts: Record<string, number> = {};
  for (const [k, v] of pieceCountsMap) {
    pieceCounts[k] = v;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <ProjectList projects={projects} pieceCounts={pieceCounts} />
    </div>
  );
}
