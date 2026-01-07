"use client";

import { useEffect, useState } from "react";

function safeParseJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    const preview = (txt || "").replace(/\s+/g, " ").slice(0, 240);
    throw new Error(preview || "Respuesta no-JSON");
  }
}

export default function CreateTagModal({
  opened,
  onClose,
  templateId,
  templateName,
  defaultResume,
  onPublished,
}: {
  opened: boolean;
  onClose: () => void;
  templateId: number | null;
  templateName?: string;
  defaultResume?: string;
  onPublished?: () => void;
}) {
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setErr(null);
    setResume(defaultResume || "");
  }, [opened, defaultResume]);

  async function publish() {
    if (!templateId) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${templateId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });

      const txt = await r.text();
      const j = safeParseJson(txt);

      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo publicar");

      onPublished?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Error publicando");
    } finally {
      setLoading(false);
    }
  }

  if (!opened) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Publicar</div>
            <div className="mt-1 text-sm text-white/60">
              {templateName || "-"} {templateId ? `(#${templateId})` : ""}
            </div>
          </div>

          <button
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm text-white/60 mb-2">Resume / notas</div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-white/25"
            placeholder="Qué cambia en esta publicación..."
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-60"
            onClick={publish}
            disabled={loading || !templateId}
          >
            {loading ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
