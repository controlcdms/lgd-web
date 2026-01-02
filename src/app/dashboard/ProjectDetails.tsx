"use client";

import { useEffect, useState } from "react";

type Branch = {
  id: number;
  name: string;
  type_deploy?: string;
  branch_status?: string;
  container_status?: string;
};

type DeployType =
  | "staging_deploy"
  | "testing_deploy"
  | "local_deploy"
  | "production_deploy";

type ActionKind = "start" | "stop" | "expire";

export default function ProjectDetails({ projectId }: { projectId: number | null }) {
  // data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // acciones por rama
  const [busy, setBusy] = useState<Record<number, ActionKind | null>>({});
  const isBusy = (branchId: number) => !!busy[branchId];

  // crear rama
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<DeployType>("staging_deploy");
  const [creating, setCreating] = useState(false);

  const reload = () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/odoo/projects/${projectId}/branches`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        return d;
      })
      .then((d) => setBranches(d?.branches || []))
      .catch((e) => {
        setBranches([]);
        setError(e?.message || "Error cargando ramas");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!projectId) {
      setBranches([]);
      setLoading(false);
      setError(null);
      setShowCreate(false);
      setNewName("");
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(`/api/odoo/projects/${projectId}/branches`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        return d;
      })
      .then((d) => setBranches(d?.branches || []))
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setBranches([]);
        setError(e?.message || "Error cargando ramas");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [projectId]);

  async function createBranch() {
    if (!projectId) return;

    const name = newName.trim();

    // validaciones básicas tipo LGD
    if (!name) {
      setError("Ponle nombre a la rama");
      return;
    }
    if (/[\\s!@#$%^&*(),.?":{}|<>]/.test(name)) {
      setError("El nombre no puede tener espacios ni caracteres raros");
      return;
    }
    if (/^[0-9]/.test(name)) {
      setError("El nombre no puede empezar con número");
      return;
    }

    // confirm solo si es producción
    if (newType === "production_deploy") {
      const ok = confirm("¿Seguro? Esto creará una rama de PRODUCCIÓN.");
      if (!ok) return;
    }

    setCreating(true);
    setError(null);

    try {
      const r = await fetch(`/api/odoo/projects/${projectId}/branches/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name, type_deploy: newType }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);

      setShowCreate(false);
      setNewName("");
      reload();
    } catch (e: any) {
      setError(e?.message || "Error creando rama");
    } finally {
      setCreating(false);
    }
  }

  async function runAction(branchId: number, action: ActionKind) {
    if (action === "expire") {
      const ok = confirm("¿Seguro que quieres expirar esta rama?");
      if (!ok) return;
    }

    setBusy((p) => ({ ...p, [branchId]: action }));
    setError(null);

    try {
      const r = await fetch(`/api/odoo/branches/${branchId}/${action}`, {
        method: "POST",
        cache: "no-store",
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);

      reload();
    } catch (e: any) {
      setError(e?.message || "Error ejecutando acción");
    } finally {
      setBusy((p) => ({ ...p, [branchId]: null }));
    }
  }

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Selecciona un proyecto para ver sus ramas.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Ramas</h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="text-xs rounded-lg border border-white/20 px-3 py-1 text-white/70 hover:text-white hover:border-white/40"
            title="Añadir rama"
          >
            ＋ Añadir rama
          </button>

          <button
            onClick={reload}
            disabled={loading}
            className="text-xs rounded-lg border border-white/20 px-3 py-1 text-white/70 hover:text-white hover:border-white/40 disabled:opacity-50"
            title="Refrescar"
          >
            ⟳ Actualizar
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="nombre rama (sin espacios)"
              className="w-64 rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none"
            />

            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as DeployType)}
              className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              title="Tipo"
            >
              <option value="staging_deploy">staging</option>
              <option value="testing_deploy">testing</option>
              <option value="local_deploy">local</option>
              <option value="production_deploy">production</option>
            </select>

            <button
              onClick={createBranch}
              disabled={creating}
              className="px-3 py-2 text-sm rounded-lg border border-emerald-400/60 text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
            >
              {creating ? "⏳ Creando..." : "Crear"}
            </button>

            <button
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              disabled={creating}
              className="px-3 py-2 text-sm rounded-lg border border-white/20 text-white/70 hover:border-white/40 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          <div className="mt-2 text-xs text-white/50">
            Reglas: sin espacios / sin símbolos raros / no empieza con número.
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-white/60">Cargando ramas…</div>}

      {!loading && error && (
        <div className="text-sm text-red-200/90 mb-2">⚠️ {error}</div>
      )}

      {!loading && !error && branches.length === 0 && (
        <div className="text-sm text-white/60">Este proyecto no tiene ramas.</div>
      )}

      <div className="space-y-2">
        {branches.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-white/20 p-3 bg-white/5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-white/60">
                {(b.type_deploy || "-")} · {(b.branch_status || "-")} ·{" "}
                {(b.container_status || "-")}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => runAction(b.id, "start")}
                disabled={isBusy(b.id)}
                className="px-3 py-1 text-xs rounded-lg border border-emerald-400/60 text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
                title="Iniciar"
              >
                {busy[b.id] === "start" ? "⏳" : "▶"} Iniciar
              </button>

              <button
                onClick={() => runAction(b.id, "stop")}
                disabled={isBusy(b.id)}
                className="px-3 py-1 text-xs rounded-lg border border-yellow-400/60 text-yellow-300 hover:bg-yellow-400/10 disabled:opacity-50"
                title="Detener"
              >
                {busy[b.id] === "stop" ? "⏳" : "⏸"} Detener
              </button>

              <button
                onClick={() => runAction(b.id, "expire")}
                disabled={isBusy(b.id)}
                className="px-3 py-1 text-xs rounded-lg border border-red-400/60 text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                title="Expirar"
              >
                {busy[b.id] === "expire" ? "⏳" : "🗑"} Expirar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
