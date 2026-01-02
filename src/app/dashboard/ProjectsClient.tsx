"use client";

import { useMemo, useState } from "react";
import ProjectsGrid from "./ProjectsGrid";
import ProjectDetails from "./ProjectDetails";

type M2O = false | [number, string];

type Project = {
  id: number;
  repo_name: string;
  progress_status?: string;
  active?: boolean;
  base_version?: string;
  branch_version?: string;
  user_id?: M2O;
  owner_id?: M2O;
  html_url?: string;
  ssh_url?: string;
};

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  // ✅ VISTA DETALLE (oculta grid)
  if (selectedProjectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/60">Proyecto</div>
            <div className="text-xl font-semibold">{selectedProject?.repo_name ?? `#${selectedProjectId}`}</div>
          </div>

          <button
            onClick={() => setSelectedProjectId(null)}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:border-white/40"
          >
            ← Volver
          </button>
        </div>

        <ProjectDetails projectId={selectedProjectId} />
      </div>
    );
  }

  // ✅ VISTA LISTA
  return (
    <ProjectsGrid
      projects={projects}
      onSelectProject={(id) => setSelectedProjectId(id)}
    />
  );
}
