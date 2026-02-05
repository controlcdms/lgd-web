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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedProjectId(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              ←
            </button>
            <div>
              <div className="text-xs font-mono text-white/40 uppercase tracking-widest">Project Unit</div>
              <div className="text-2xl font-bold tracking-tight text-white">{selectedProject?.repo_name ?? `#${selectedProjectId}`}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Actions placeholder: Settings, Git Link, etc */}
            {selectedProject?.html_url && (
              <a
                href={selectedProject.html_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60 hover:text-white transition-colors"
              >
                GitHub Repo ↗
              </a>
            )}
          </div>
        </div>

        <ProjectDetails projectId={selectedProjectId} />
      </div>
    );
  }

  // ✅ VISTA LISTA
  return (
    <ProjectsGrid
      projects={projects}
      selectedProjectId={null}
      onSelectProject={(id) => setSelectedProjectId(id)}
      onCreated={(newId) => {
        if (newId) setSelectedProjectId(newId);
      }}
    />
  );
}
