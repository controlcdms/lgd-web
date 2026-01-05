"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  onCreated?: () => void; // refresca lista desde el padre
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
      const owner = (p.owner_id?.[1] || "").toLowerCase();
      const user = (p.user_id?.[1] || "").toLowerCase();
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
      const r = await fetch("/api/odoo/templates", { cache: "no-store" });
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
    if (!baseVersionId) return setErr("Elige imagen base.");

    setCreating(true);
    try {
      const r = await fetch("/api/odoo/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          base_version: baseVersionId,
        }),
      });

      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo crear.");

      setShowCreate(false);
      setName("");
      setBaseVersionId("");
      router.refresh();
      onCreated?.();
    } catch (e: any) {
      setErr(e?.message || "Error creando proyecto.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* buscador + crear */}
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

        <button
          className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
          onClick={() => {
            setErr(null);
            setShowCreate(true);
            loadTemplates();
          }}
        >
          ＋ Crear proyecto
        </button>
      </div>

      {/* modal create */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-zinc-950 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold text-white">Crear nuevo proyecto</div>
            <div className="text-sm text-white/60 mt-1">
              Configura tu nuevo proyecto de Odoo en la nube
            </div>

            {err && (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {err}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm text-white/80">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="p. ej. my-project"
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                />
                <div className="text-xs text-white/50">
                  Solo minúsculas, números y guiones. Sin espacios.
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-sm text-white/80">Imagen base</label>
                <select
                  value={baseVersionId}
                  onChange={(e) => setBaseVersionId(Number(e.target.value) || "")}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">
                    {loadingTemplates ? "Cargando..." : "Selecciona imagen base"}
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.branch_version ? ` (${t.branch_version})` : ""}
                      {t.image_type_scope ? ` • ${t.image_type_scope}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                disabled={creating}
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
                disabled={creating}
                onClick={createProject}
              >
                {creating ? "Creando..." : "Crear proyecto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="text-sm text-white/70">No hay resultados.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const active = selectedProjectId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject?.(p.id)}
                className={[
                  "cursor-pointer rounded-2xl border p-4 bg-white/5 transition",
                  active
                    ? "border-blue-400 ring-1 ring-blue-400/60"
                    : "border-white/20 hover:border-white/40",
                ].join(" ")}
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

                <div className="mt-3 text-xs">
                  {p.html_url && (
                    <a
                      className="underline text-white/80"
                      href={p.html_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      repo
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
