"use client";

import { useEffect, useMemo, useState } from "react";
import DependenciesModal from "./DependenciesModal";

type DepResp = {
  ok: boolean;
  error?: string;
  pip?: string[];
  apt?: string[];
};

function safeParseJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    const preview = (txt || "").replace(/\s+/g, " ").slice(0, 240);
    throw new Error(preview || "Respuesta no-JSON");
  }
}

export default function ImageDependenciesPanel({
  templateId,
  // opcional: para refrescar afuera (ImageDetailsClient)
  onSaved,
}: {
  templateId: number;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pip, setPip] = useState<string[]>([]);
  const [apt, setApt] = useState<string[]>([]);

  const [openEdit, setOpenEdit] = useState(false);

  async function loadDeps() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${templateId}/dependencies`, {
        cache: "no-store",
      });
      const txt = await r.text();
      const j = safeParseJson(txt) as DepResp;

      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar deps");

      setPip(Array.isArray(j.pip) ? j.pip : []);
      setApt(Array.isArray(j.apt) ? j.apt : []);
    } catch (e: any) {
      setErr(e?.message || "Error deps");
      setPip([]);
      setApt([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!templateId) return;
    loadDeps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const pipPreview = useMemo(() => {
    if (!pip.length) return "-";
    return pip.slice(0, 6).join(", ") + (pip.length > 6 ? "…" : "");
  }, [pip]);

  const aptPreview = useMemo(() => {
    if (!apt.length) return "-";
    return apt.slice(0, 6).join(", ") + (apt.length > 6 ? "…" : "");
  }, [apt]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60">Dependencias</div>

        <button
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-60"
          onClick={() => setOpenEdit(true)}
          disabled={loading}
        >
          Editar
        </button>
      </div>

      {err && (
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-white/50">PIP</div>
          <div className="mt-1 text-sm text-white/80">
            {loading ? "Cargando..." : pipPreview}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-white/50">APT</div>
          <div className="mt-1 text-sm text-white/80">
            {loading ? "Cargando..." : aptPreview}
          </div>
        </div>
      </div>

      <DependenciesModal
        opened={openEdit}
        onClose={() => setOpenEdit(false)}
        templateId={templateId}
        initialPip={pip}
        initialApt={apt}
        onSaved={() => {
          setOpenEdit(false);
          loadDeps();
          onSaved?.();
        }}
      />
    </div>
  );
}
