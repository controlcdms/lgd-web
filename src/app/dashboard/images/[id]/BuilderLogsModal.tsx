"use client";

import { useEffect, useState } from "react";

function safeParseJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error((txt || "").slice(0, 240) || "Respuesta no-JSON");
  }
}

export default function BuilderLogsModal({
  opened,
  onClose,
  jobId,
}: {
  opened: boolean;
  onClose: () => void;
  jobId: string;
}) {
  const [status, setStatus] = useState<string>("");
  const [logs, setLogs] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!jobId) return;
    setLoading(true);
    setErr(null);
    try {
      const r1 = await fetch(`/api/builder/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const t1 = await r1.text();
      const j1 = safeParseJson(t1);
      if (!r1.ok || !j1?.ok) throw new Error(j1?.detail || j1?.error || "No se pudo cargar status");
      setStatus(String(j1?.job?.status || ""));

      const r2 = await fetch(`/api/builder/jobs/${encodeURIComponent(jobId)}/logs?tail=2000`, { cache: "no-store" });
      const t2 = await r2.text();
      const j2 = safeParseJson(t2);
      if (!r2.ok || !j2?.ok) throw new Error(j2?.detail || j2?.error || "No se pudo cargar logs");
      setLogs(String(j2?.logs || ""));
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!opened) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, jobId]);

  if (!opened) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Logs del builder</div>
            <div className="mt-1 text-sm text-white/60">job: {jobId}</div>
            <div className="mt-1 text-sm text-white/60">estado: {status || "-"}</div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
              onClick={load}
              disabled={loading}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <pre className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/80 whitespace-pre-wrap">
{logs || "(sin logs)"}
        </pre>
      </div>
    </div>
  );
}
