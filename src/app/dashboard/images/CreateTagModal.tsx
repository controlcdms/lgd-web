"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState(defaultResume || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setErr(null);
    setLoading(false);
    setMessage("");
    setResume(defaultResume || "");
  }, [opened, defaultResume]);

  const canConfirm = useMemo(() => {
    return !!templateId && message.trim().length > 0 && !loading;
  }, [templateId, message, loading]);

  async function submit() {
    setErr(null);
    if (!templateId) return setErr("No template seleccionado.");
    if (!message.trim()) return setErr("Pon release notes.");

    setLoading(true);
    try {
      const r = await fetch("/api/odoo/images/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          message: message.trim(),
          resume: resume.trim(),
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo publicar");

      onClose();
      onPublished?.();
    } catch (e: any) {
      setErr(e?.message || "Error publicando");
    } finally {
      setLoading(false);
    }
  }

  if (!opened) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-white/15 bg-zinc-950 p-0 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="text-lg font-semibold">Desplegar Docker image</div>
          <button
            className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/10"
            onClick={() => !loading && onClose()}
          >
            ✕
          </button>
        </div>

        {templateName && (
          <div className="px-6 pt-3 text-sm text-white/60">
            Imagen: <span className="font-medium text-white">{templateName}</span>
          </div>
        )}

        {err && (
          <div className="mx-6 mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-white/80">Release notes</label>
              <textarea
                className="mt-2 h-32 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Qué cambia en este release..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/80">Resume</label>
              <textarea
                className="mt-2 h-32 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Resumen (opcional)"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 border-t border-white/10 px-6 py-4">
          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            disabled={!canConfirm}
            onClick={submit}
          >
            {loading ? "Publicando..." : "Confirm"}
          </button>
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
