"use client";

import { useState } from "react";
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <ProjectsGrid
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />
      </div>

      <div className="lg:sticky lg:top-6 h-fit">
        <ProjectDetails projectId={selectedProjectId} />
      </div>
    </div>
  );
}
