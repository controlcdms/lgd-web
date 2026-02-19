"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ProjectsGrid from "./ProjectsGrid";
import ProjectDetails from "./ProjectDetails";
import ProjectsLoading from "./ProjectsLoading";

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

export default function ProjectsClient({
  githubId,
  initialProjects,
}: {
  githubId: string;
  initialProjects?: Project[];
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(initialProjects || []);

  // Summary cache + dedupe (in-memory) to avoid repeated enrichment calls.
  const summaryLoadedRef = useRef<Set<number>>(new Set());
  const summaryInflightRef = useRef<Set<number>>(new Set());
  const summaryQueueRef = useRef<Set<number>>(new Set());
  const summaryTimerRef = useRef<any>(null);

  const requestSummary = (repoIds: number[]) => {
    const ids = (repoIds || []).map(Number).filter((x) => Number.isFinite(x));
    for (const id of ids) {
      if (summaryLoadedRef.current.has(id)) continue;
      if (summaryInflightRef.current.has(id)) continue;
      summaryQueueRef.current.add(id);
    }

    if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current);
    summaryTimerRef.current = setTimeout(async () => {
      const batch = Array.from(summaryQueueRef.current);
      summaryQueueRef.current = new Set();
      if (!batch.length) return;

      // Guardrail: avoid huge batches.
      const limited = batch.slice(0, 120);
      limited.forEach((id) => summaryInflightRef.current.add(id));

      try {
        const rr = await fetch("/api/odoo/projects/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoIds: limited }),
        });
        const jj = await rr.json().catch(() => ({}));
        if (!rr.ok || !jj?.ok) return;

        const map = jj.summaryByRepoId || {};
        limited.forEach((id) => {
          summaryInflightRef.current.delete(id);
          if (map[String(id)]) summaryLoadedRef.current.add(id);
        });

        setProjects((prev) =>
          prev.map((p) => {
            const s = map[String(p.id)];
            if (!s) return p;
            return { ...p, ...s } as any;
          })
        );
      } catch {
        limited.forEach((id) => summaryInflightRef.current.delete(id));
      }
    }, 200);
  };

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/odoo/projects", {
        headers: { "x-github-id": String(githubId) },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const baseProjects = (j.projects || []) as Project[];
      setProjects(baseProjects);

      // Enrich will be requested on-demand as cards become visible (IntersectionObserver in ProjectsGrid).
      // We keep an optional small warm-up here to make the first paint look complete quickly.
      // Reset per-load caches (new user / refresh)
      summaryLoadedRef.current = new Set();
      summaryInflightRef.current = new Set();
      summaryQueueRef.current = new Set();

      requestSummary(baseProjects.map((p) => p.id).slice(0, 12));
    } catch (e: any) {
      setProjects([]);
      setErr(e?.message || "Error cargando proyectos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubId]);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // If user navigates back to the dashboard (e.g., clicks Projects in sidebar),
  // exit details view and show the cards grid.
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/dashboard") {
      setSelectedProjectId(null);
    }
  }, [pathname]);

  // Sidebar navigation (e.g., clicking "Proyectos" while already on /dashboard)
  useEffect(() => {
    const handler = (ev: any) => {
      const href = String(ev?.detail?.href || "");
      if (href === "/dashboard") setSelectedProjectId(null);
    };
    window.addEventListener("lgd:navigate", handler as any);
    return () => window.removeEventListener("lgd:navigate", handler as any);
  }, []);


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
  if (loading && projects.length === 0) {
    return <ProjectsLoading />;
  }

  if (err) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
        <div className="font-medium mb-1">No se pudo cargar proyectos</div>
        <div className="text-white/60">{err}</div>
        <button
          className="mt-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
          onClick={() => load()}
          disabled={loading}
        >
          {loading ? "Cargando…" : "Reintentar"}
        </button>
      </div>
    );
  }

  return (
    <ProjectsGrid
      projects={projects}
      selectedProjectId={null}
      onSelectProject={(id) => setSelectedProjectId(id)}
      onCreated={(newId) => {
        if (newId) setSelectedProjectId(newId);
      }}
      onVisibleRepoIds={(ids) => requestSummary(ids)}
    />
  );
}
