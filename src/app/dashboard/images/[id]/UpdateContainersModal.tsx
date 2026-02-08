"use client";

import { useEffect, useMemo, useState } from "react";

type ContainerRow = {
  id: number;
  pipeline_name?: string;
  container_status?: string;
  server_url_nginx?: string;
  current_docker_image?: string;
  doodba_release_id?: any;
};

function safeParseJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    const preview = (txt || "").replace(/\s+/g, " ").slice(0, 240);
    throw new Error(preview || "Respuesta no-JSON");
  }
}

export default function UpdateContainersModal({
  opened,
  onClose,
  templateId,
  releaseId,
  releaseName,
}: {
  opened: boolean;
  onClose: () => void;
  templateId: number;
  releaseId: number;
  releaseName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ContainerRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/odoo/images/${templateId}/outdated-containers?releaseId=${releaseId}`,
        { cache: "no-store" }
      );
      const txt = await r.text();
      const j = safeParseJson(txt);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar contenedores");

      const list = Array.isArray(j.containers) ? j.containers : [];
      setRows(list);
      const init: Record<number, boolean> = {};
      for (const c of list) init[Number(c.id)] = false;
      setSelected(init);
    } catch (e: any) {
      setErr(e?.message || "Error");
      setRows([]);
      setSelected({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!opened) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, templateId, releaseId]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected]
  );

  async function apply() {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/containers/update-release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, containerIds: selectedIds }),
      });
      const txt = await r.text();
      const j = safeParseJson(txt);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo actualizar");

      // recargar lista (los que ya se actualizaron deberían desaparecer)
      await load();
    } catch (e: any) {
      setErr(e?.message || "Error actualizando");
    } finally {
      setSaving(false);
    }
  }

  if (!opened) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Actualizar contenedores</div>
            <div className="mt-1 text-sm text-white/60">
              Release: {releaseName || `#${releaseId}`} (id {releaseId})
            </div>
          </div>

          <button
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            onClick={onClose}
            disabled={saving}
          >
            Cerrar
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-sm text-white/60">
            {loading ? "Cargando..." : `${rows.length} contenedores desfasados`}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
              onClick={() => {
                const next: Record<number, boolean> = {};
                for (const r of rows) next[Number(r.id)] = true;
                setSelected(next);
              }}
              disabled={loading || saving || rows.length === 0}
            >
              Seleccionar todo
            </button>

            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
              onClick={() => {
                const next: Record<number, boolean> = {};
                for (const r of rows) next[Number(r.id)] = false;
                setSelected(next);
              }}
              disabled={loading || saving || rows.length === 0}
            >
              Limpiar
            </button>

            <button
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-60"
              onClick={apply}
              disabled={loading || saving || selectedIds.length === 0}
              title="Aplica uno por uno"
            >
              {saving ? "Actualizando..." : `Actualizar (${selectedIds.length})`}
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
          <div className="bg-zinc-950/60 px-4 py-2 text-xs text-white/60">
            SEL • PIPELINE • ESTADO • URL • RELEASE ACTUAL
          </div>
          <div className="divide-y divide-white/10 max-h-[55vh] overflow-auto">
            {rows.map((c) => {
              const rid = Array.isArray((c as any).doodba_release_id)
                ? (c as any).doodba_release_id?.[1]
                : (c as any).doodba_release_id;
              return (
                <label
                  key={c.id}
                  className="px-4 py-3 hover:bg-white/5 flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!selected[c.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [c.id]: e.target.checked }))}
                    className="mt-1"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.pipeline_name || `#${c.id}`}</div>
                    <div className="mt-1 text-xs text-white/60 flex flex-wrap gap-3">
                      <span>estado: {c.container_status || "-"}</span>
                      <span>url: {c.server_url_nginx || "-"}</span>
                      <span>release: {rid || "-"}</span>
                    </div>
                  </div>
                </label>
              );
            })}

            {!loading && rows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-white/60">No hay contenedores desfasados.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
