"use client";

import { useEffect, useMemo, useState } from "react";

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => x.trim()).filter(Boolean)));
}

function safeParseJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    const preview = (txt || "").replace(/\s+/g, " ").slice(0, 240);
    throw new Error(preview || "Respuesta no-JSON");
  }
}

export default function DependenciesModal({
  opened,
  onClose,
  templateId,
  initialPip,
  initialApt,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  templateId: number;
  initialPip?: string[];
  initialApt?: string[];
  onSaved?: () => void;
}) {
  const [pip, setPip] = useState<string[]>([]);
  const [apt, setApt] = useState<string[]>([]);
  const [pipInput, setPipInput] = useState("");
  const [aptInput, setAptInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setErr(null);
    setPip(Array.isArray(initialPip) ? [...initialPip] : []);
    setApt(Array.isArray(initialApt) ? [...initialApt] : []);
    setPipInput("");
    setAptInput("");
  }, [opened, initialPip, initialApt]);

  const pipList = useMemo(() => uniq(pip), [pip]);
  const aptList = useMemo(() => uniq(apt), [apt]);

  function addOne(kind: "pip" | "apt") {
    const val = (kind === "pip" ? pipInput : aptInput).trim();
    if (!val) return;

    if (kind === "pip") {
      setPip((x) => uniq([...x, val]));
      setPipInput("");
    } else {
      setApt((x) => uniq([...x, val]));
      setAptInput("");
    }
  }

  function removeOne(kind: "pip" | "apt", name: string) {
    if (kind === "pip") setPip((x) => x.filter((t) => t !== name));
    else setApt((x) => x.filter((t) => t !== name));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${templateId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pip: pipList,
          apt: aptList,
        }),
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
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Dependencias</div>
            <div className="mt-1 text-sm text-white/60">templateId: {templateId}</div>
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
            <div className="text-sm text-white/60">PIP</div>

            <div className="mt-2 flex gap-2">
              <input
                value={pipInput}
                onChange={(e) => setPipInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addOne("pip");
                }}
                placeholder="Ej: fastapi"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/25"
              />
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                onClick={() => addOne("pip")}
              >
                +
              </button>
            </div>

            {pipList.length === 0 ? (
              <div className="mt-3 text-sm text-white/50">-</div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {pipList.map((p) => (
                  <button
                    key={p}
                    onClick={() => removeOne("pip", p)}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                    title="Quitar"
                  >
                    {p} <span className="text-white/50">✕</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* APT */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">APT</div>

            <div className="mt-2 flex gap-2">
              <input
                value={aptInput}
                onChange={(e) => setAptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addOne("apt");
                }}
                placeholder="Ej: git"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/25"
              />
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                onClick={() => addOne("apt")}
              >
                +
              </button>
            </div>

            {aptList.length === 0 ? (
              <div className="mt-3 text-sm text-white/50">-</div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {aptList.map((a) => (
                  <button
                    key={a}
                    onClick={() => removeOne("apt", a)}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                    title="Quitar"
                  >
                    {a} <span className="text-white/50">✕</span>
                  </button>
                ))}
              </div>
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
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
