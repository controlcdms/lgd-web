"use client";

import { useMemo, useState } from "react";

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

export default function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => {
      const repo = (p.repo_name || "").toLowerCase();
      const owner = (p.owner_id && p.owner_id[1] ? p.owner_id[1] : "").toLowerCase();
      const user = (p.user_id && p.user_id[1] ? p.user_id[1] : "").toLowerCase();
      const url = (p.html_url || "").toLowerCase();
      return (
        repo.includes(s) ||
        owner.includes(s) ||
        user.includes(s) ||
        url.includes(s)
      );
    });
  }, [q, projects]);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar repo / owner / user..."
          className="w-full max-w-md rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
        <div className="text-xs text-white/60">
          {filtered.length}/{projects.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-white/70">No hay resultados.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-white/20 p-4 bg-white/5"
            >
              <div className="font-semibold text-lg">{p.repo_name}</div>

              <div className="text-xs text-white/60 mt-1">
                {p.owner_id ? `Owner: ${p.owner_id[1]}` : "Owner: -"}
                {p.user_id ? ` • User: ${p.user_id[1]}` : ""}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {typeof p.active === "boolean" && (
                  <span className="text-xs rounded-full border border-white/30 px-2 py-1 text-white/80">
                    {p.active ? "active" : "inactive"}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                {p.html_url && (
                  <a
                    className="underline text-white/80"
                    href={p.html_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    repo
                  </a>
                )}
                {p.ssh_url && (
                  <span className="text-white/50 truncate" title={p.ssh_url}>
                    ssh: {p.ssh_url}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
