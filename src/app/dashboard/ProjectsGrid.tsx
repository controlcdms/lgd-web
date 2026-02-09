"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type M2O = false | [number, string];

type Project = {
  id: number;
  repo_name: string;
  progress_status?: string;
  active?: boolean;
  base_version?: any; // many2one doodba.template in Odoo
  branch_version?: string;
  user_id?: M2O;
  owner_id?: M2O;
  html_url?: string;
  ssh_url?: string;
  // enriched summary (from API)
  prod_release?: any;
  prod_image?: string | null;
};

type Template = {
  id: number;
  name: string;
  branch_version?: string;
  image_type_scope?: string;
};

export default function ProjectsGrid({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreated,
}: {
  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject?: (projectId: number) => void;
  onCreated?: (newProjectId?: number) => void; // refresca lista desde el padre; opcionalmente selecciona
}) {
  const [q, setQ] = useState("");
  const router = useRouter();

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [baseVersionId, setBaseVersionId] = useState<number | "">("");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => {
      const repo = (p.repo_name || "").toLowerCase();
      const owner = (Array.isArray(p.owner_id) ? p.owner_id[1] : "").toLowerCase();
      const user = (Array.isArray(p.user_id) ? p.user_id[1] : "").toLowerCase();
      const url = (p.html_url || "").toLowerCase();
      return (
        repo.includes(s) || owner.includes(s) || user.includes(s) || url.includes(s)
      );
    });
  }, [q, projects]);

  async function loadTemplates() {
    setLoadingTemplates(true);
    setErr(null);
    try {
      const r = await fetch("/api/odoo/templates");
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar templates");
      setTemplates(j.templates || []);
    } catch (e: any) {
      setTemplates([]);
      setErr(e?.message || "Error cargando templates");
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function createProject() {
    setErr(null);

    const n = name.trim();
    if (!n) return setErr("Ponle nombre.");
    if (!/^[a-z][a-z0-9-]*$/.test(n)) {
      return setErr("Nombre inválido: usa minúsculas, números y guiones; empieza con letra.");
    }
    if (!baseVersionId) return setErr("Elige imagen base.");

    setCreating(true);
    try {
      const r = await fetch("/api/odoo/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          base_version_id: baseVersionId,
          type_deploy_repository: "production_deploy",
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo crear.");

      const newId = Number(j?.result?.repository_id || 0) || undefined;

      setShowCreate(false);
      setName("");
      setBaseVersionId("");

      // refrescar lista y seleccionar el nuevo proyecto
      router.refresh();
      if (newId) onSelectProject?.(newId);
      onCreated?.(newId);
    } catch (e: any) {
      setErr(e?.message || "Error creando proyecto.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* buscador + crear */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xl group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-white/40">🔍</span>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects..."
            className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl leading-5 bg-black/40 text-white placeholder-white/40 focus:outline-none focus:bg-black/60 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-xs text-white/30 font-mono">CMD+K</span>
          </div>
        </div>

        <button
          className="flex items-center gap-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => {
            setErr(null);
            setShowCreate(true);
            loadTemplates();
          }}
        >
          <span>＋</span> New Project
        </button>
      </div>

      <div className="mb-4 text-xs font-mono text-white/40 uppercase tracking-widest pl-1">
        {filtered.length} Projects Active
      </div>

      {/* modal create */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0c0e] p-6 shadow-2xl ring-1 ring-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xl font-bold text-white tracking-tight">Deploy New Unit</div>
              <div className="text-[10px] font-mono border border-blue-500/30 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">INIT_SEQ</div>
            </div>
            <div className="text-sm text-white/50 mb-6 font-light">
              Provision a new Odoo instance container.
            </div>

            {err && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-200 flex items-center gap-2">
                <span>⚠</span> {err}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider">Project Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. hyperscale-core"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors"
                />
                <div className="text-[10px] text-white/30 font-mono">
                  lowercase-kebab-case-only
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider">Base Image</label>
                <select
                  value={baseVersionId}
                  onChange={(e) => setBaseVersionId(Number(e.target.value) || "")}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors appearance-none"
                  style={{ backgroundImage: "none" }} // Custom arrow implementation needed or keep default simple
                >
                  <option value="" className="bg-zinc-900 text-white/50">
                    {loadingTemplates ? "Scanning registry..." : "Select base image..."}
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id} className="bg-zinc-900">
                      {t.name}
                      {t.branch_version ? ` [v${t.branch_version}]` : ""}
                      {t.image_type_scope ? ` :: ${t.image_type_scope}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                disabled={creating}
                onClick={() => setShowCreate(false)}
              >
                Abort
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]"
                disabled={creating}
                onClick={createProject}
              >
                {creating ? "Deploying..." : "Launch Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <div className="text-3xl mb-2 opacity-20">📡</div>
          <div className="text-sm text-white/50">No signals found.</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const active = selectedProjectId === p.id;
            const statusColor = p.active ? "bg-emerald-500" : "bg-zinc-600";
            const shadowColor = p.active ? "shadow-emerald-500/20" : "shadow-transparent";

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject?.(p.id)}
                className={`
                  group relative cursor-pointer overflow-hidden rounded-xl border p-5 transition-all duration-300
                  ${active
                    ? "border-blue-500/50 bg-blue-900/10 ring-1 ring-blue-500/20"
                    : "border-white/5 bg-[#121214] hover:border-white/10 hover:bg-[#18181b] hover:scale-[1.01] hover:shadow-xl"
                  }
                `}
              >
                {/* Status Dot */}
                <div className="absolute top-4 right-4 flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor} ${shadowColor} shadow-[0_0_8px]`}></span>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold text-lg text-white tracking-tight group-hover:text-blue-200 transition-colors">
                    {p.repo_name}
                  </h3>
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center gap-1.5">
                      {/* Owner Badge */}
                      {p.owner_id ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/60">
                          {p.owner_id[1]}
                        </span>
                      ) : null}
                    </div>

                    {p.base_version && (
                      <div className="text-[10px] font-mono text-white/50">
                        <div className="truncate">
                          image: {Array.isArray(p.base_version) ? p.base_version[1] : String(p.base_version)}
                          {p.branch_version ? ` [v${p.branch_version}]` : ""}
                          {Array.isArray(p.base_version) && p.base_version[0] ? (
                            <button
                              type="button"
                              className="ml-2 text-blue-400 hover:text-blue-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/images/${p.base_version[0]}`);
                              }}
                              title="Ver imagen"
                            >
                              ↗
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Status</span>
                    <span className={p.active ? "text-emerald-400" : "text-zinc-500"}>
                      {p.active ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                  {/* Fake stats/lines for visuals if needed, or real data if available */}
                  <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full bg-blue-500/50 w-2/3 ${p.active ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                  <div className="text-[10px] font-mono text-white/40">
                    ID: {p.id.toString().padStart(4, '0')}
                  </div>
                  {p.html_url && (
                    <a
                      href={p.html_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      GIT ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
