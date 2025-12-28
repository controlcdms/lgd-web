"use client";

import { useEffect, useState } from "react";

type Branch = {
  id: number;
  name: string;
  type_deploy?: string;
  branch_status?: string;
  container_status?: string;
};

export default function ProjectDetails({ projectId }: { projectId: number | null }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // si no hay proyecto seleccionado: limpia y sal
    if (!projectId) {
      setBranches([]);
      setLoading(false);
      setError(null);
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

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Selecciona un proyecto para ver sus ramas.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold mb-3">Ramas</h3>

      {loading && <div className="text-sm text-white/60">Cargando ramas…</div>}

      {!loading && error && (
        <div className="text-sm text-red-200/90">⚠️ {error}</div>
      )}

      {!loading && !error && branches.length === 0 && (
        <div className="text-sm text-white/60">Este proyecto no tiene ramas.</div>
      )}

      <div className="space-y-2">
        {branches.map((b) => (
          <div key={b.id} className="rounded-xl border border-white/20 p-3 bg-white/5">
            <div className="font-medium">{b.name}</div>
            <div className="text-xs text-white/60">
              {(b.type_deploy || "-")} · {(b.branch_status || "-")} · {(b.container_status || "-")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
