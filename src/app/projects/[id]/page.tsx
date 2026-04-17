import { notFound } from "next/navigation";
import { getProjectById, getPiecesByProject } from "@/lib/data/store";
import { ProjectDetail } from "@/components/projects/project-detail";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = getProjectById(id);

  if (!project) {
    notFound();
  }

  const pieces = getPiecesByProject(project.id);

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <ProjectDetail project={project} pieces={pieces} />
    </div>
  );
}
