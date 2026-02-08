"use client";

import { useEffect, useMemo, useState } from "react";

type CatalogItem = { id: number; name: string };

type DepsApiResp = {
  ok: boolean;
  error?: string;
  selected?: { pip_ids?: number[]; apt_ids?: number[] };
  catalog?: { pip?: CatalogItem[]; apt?: CatalogItem[] };
};

function safeParseJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    const preview = (txt || "").replace(/\s+/g, " ").slice(0, 240);
    throw new Error(preview || "Respuesta no-JSON");
  }
}

function normalizeIds(x: any): number[] {
  return Array.isArray(x)
    ? x.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
}

export default function DependenciesModal({
  opened,
  onClose,
  templateId,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  templateId: number;
  // initialPip/initialApt kept by caller but not used anymore (we read ids + catalog from Odoo)
  initialPip?: string[];
  initialApt?: string[];
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pipCatalog, setPipCatalog] = useState<CatalogItem[]>([]);
  const [aptCatalog, setAptCatalog] = useState<CatalogItem[]>([]);

  const [pipIds, setPipIds] = useState<number[]>([]);
  const [aptIds, setAptIds] = useState<number[]>([]);

  const [pipQ, setPipQ] = useState("");
  const [aptQ, setAptQ] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${templateId}/deps`, { cache: "no-store" });
      const txt = await r.text();
      const j = safeParseJson(txt) as DepsApiResp;
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar catálogo");

      setPipCatalog(Array.isArray(j.catalog?.pip) ? j.catalog!.pip! : []);
      setAptCatalog(Array.isArray(j.catalog?.apt) ? j.catalog!.apt! : []);

      setPipIds(normalizeIds(j.selected?.pip_ids));
      setAptIds(normalizeIds(j.selected?.apt_ids));

      setPipQ("");
      setAptQ("");
    } catch (e: any) {
      setErr(e?.message || "Error");
      setPipCatalog([]);
      setAptCatalog([]);
      setPipIds([]);
      setAptIds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!opened) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, templateId]);

  const pipById = useMemo(() => new Map(pipCatalog.map((x) => [x.id, x.name])), [pipCatalog]);
  const aptById = useMemo(() => new Map(aptCatalog.map((x) => [x.id, x.name])), [aptCatalog]);

  const pipSelectedNames = useMemo(
    () => pipIds.map((id) => pipById.get(id)).filter(Boolean) as string[],
    [pipIds, pipById]
  );
  const aptSelectedNames = useMemo(
    () => aptIds.map((id) => aptById.get(id)).filter(Boolean) as string[],
    [aptIds, aptById]
  );

  const pipFiltered = useMemo(() => {
    const s = pipQ.trim().toLowerCase();
    if (!s) return pipCatalog;
    return pipCatalog.filter((x) => String(x.name || "").toLowerCase().includes(s));
  }, [pipQ, pipCatalog]);

  const aptFiltered = useMemo(() => {
    const s = aptQ.trim().toLowerCase();
    if (!s) return aptCatalog;
    return aptCatalog.filter((x) => String(x.name || "").toLowerCase().includes(s));
  }, [aptQ, aptCatalog]);

  function toggle(setter: (fn: (xs: number[]) => number[]) => void, id: number) {
    setter((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${templateId}/deps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pip_ids: pipIds, apt_ids: aptIds }),
      });
      const txt = await r.text();
      const j = safeParseJson(txt);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo guardar deps");
      onSaved?.();
    } catch (e: any) {
      setErr(e?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  if (!opened) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Dependencias</div>
            <div className="mt-1 text-sm text-white/60">
              Selecciona dependencias existentes (aprobadas) en Odoo.
            </div>
            <div className="mt-1 text-xs text-white/50">
              Para agregar nuevas dependencias: hacerlo en backoffice.
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

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* PIP */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">PIP</div>
              <div className="text-xs text-white/50">{pipIds.length} seleccionadas</div>
            </div>

            <input
              value={pipQ}
              onChange={(e) => setPipQ(e.target.value)}
              placeholder="Buscar..."
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/25"
              disabled={loading || saving}
            />

            <div className="mt-3 max-h-[300px] overflow-auto rounded-xl border border-white/10 bg-black/20">
              {loading ? (
                <div className="p-3 text-sm text-white/60">Cargando catálogo...</div>
              ) : pipFiltered.length === 0 ? (
                <div className="p-3 text-sm text-white/60">No hay resultados.</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {pipFiltered.map((d) => (
                    <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipIds.includes(d.id)}
                        onChange={() => toggle(setPipIds, d.id)}
                      />
                      <span className="text-sm text-white/80">{d.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {pipSelectedNames.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {pipSelectedNames.slice(0, 24).map((n) => (
                  <span key={n} className="text-xs rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                    {n}
                  </span>
                ))}
                {pipSelectedNames.length > 24 ? (
                  <span className="text-xs text-white/50">+{pipSelectedNames.length - 24}</span>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 text-sm text-white/50">-</div>
            )}
          </div>

          {/* APT */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">APT</div>
              <div className="text-xs text-white/50">{aptIds.length} seleccionadas</div>
            </div>

            <input
              value={aptQ}
              onChange={(e) => setAptQ(e.target.value)}
              placeholder="Buscar..."
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/25"
              disabled={loading || saving}
            />

            <div className="mt-3 max-h-[300px] overflow-auto rounded-xl border border-white/10 bg-black/20">
              {loading ? (
                <div className="p-3 text-sm text-white/60">Cargando catálogo...</div>
              ) : aptFiltered.length === 0 ? (
                <div className="p-3 text-sm text-white/60">No hay resultados.</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {aptFiltered.map((d) => (
                    <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aptIds.includes(d.id)}
                        onChange={() => toggle(setAptIds, d.id)}
                      />
                      <span className="text-sm text-white/80">{d.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {aptSelectedNames.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {aptSelectedNames.slice(0, 24).map((n) => (
                  <span key={n} className="text-xs rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                    {n}
                  </span>
                ))}
                {aptSelectedNames.length > 24 ? (
                  <span className="text-xs text-white/50">+{aptSelectedNames.length - 24}</span>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 text-sm text-white/50">-</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-60"
            onClick={save}
            disabled={saving || loading}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
