"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void; // para recargar lista
};

export default function CreateImageModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [branchVersion, setBranchVersion] = useState<"16.0" | "17.0" | "18.0">("17.0");
  const [scope, setScope] = useState<"private_image" | "public_image">("private_image");
  const [description, setDescription] = useState("");
  const [customCommit, setCustomCommit] = useState(false);
  const [commit, setCommit] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsErr, setCommitsErr] = useState<string | null>(null);
  const [commits, setCommits] = useState<any[]>([]);

  const nameHint = useMemo(() => {
    const n = name.trim();
    if (!n) return "Solo minúsculas, números y guiones. Empieza con letra.";
    if (!/^[a-z][a-z0-9-]*$/.test(n)) return "Nombre inválido.";
    return "OK";
  }, [name]);

  async function loadCommits(version: string) {
    setCommitsLoading(true);
    setCommitsErr(null);
    try {
      const r = await fetch(`/api/odoo/commits?version=${encodeURIComponent(version)}&limit=80`, {
        cache: "no-store",
      });
      const txt = await r.text();
      let j: any;
      try {
        j = JSON.parse(txt);
      } catch {
        throw new Error(txt.slice(0, 200));
      }
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar commits");
      setCommits(Array.isArray(j.commits) ? j.commits : []);
    } catch (e: any) {
      setCommits([]);
      setCommitsErr(e?.message || "Error cargando commits");
    } finally {
      setCommitsLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!customCommit) return;
    loadCommits(branchVersion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customCommit]);

  useEffect(() => {
    if (!open) return;
    if (!customCommit) return;
    loadCommits(branchVersion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchVersion]);

  async function submit() {
    setErr(null);
    const n = name.trim();
    if (!n) return setErr("Ponle nombre.");
    if (!/^[a-z][a-z0-9-]*$/.test(n)) return setErr("Nombre inválido.");

    if (customCommit && !commit.trim()) {
      return setErr("El commit es obligatorio cuando habilitas commit personalizado.");
    }

    setCreating(true);
    try {
      const r = await fetch("/api/odoo/images/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          branch_version: branchVersion,
          image_type_scope: scope,
          description: description.trim(),
          commit: customCommit ? commit.trim() : "",
        }),
      });

      const text = await r.text();
      let j: any;
      try {
        j = JSON.parse(text);
      } catch {
        throw new Error(`API no devolvió JSON. HTTP ${r.status}. ${text.slice(0, 80)}`);
      }
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo crear.");

      // reset
      setName("");
      setBranchVersion("17.0");
      setScope("private_image");
      setDescription("");
      setCustomCommit(false);
      setCommit("");

      onClose();
      onCreated(); // recarga
    } catch (e: any) {
      setErr(e?.message || "Error creando imagen.");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !creating && onClose()}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-zinc-950 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">🚀 Crear nueva imagen de Docker</div>
            <div className="text-sm text-white/60 mt-1">Define los atributos principales de tu nueva imagen</div>
          </div>
          <button className="text-white/60 hover:text-white" onClick={() => !creating && onClose()}>✕</button>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-4 grid gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={customCommit}
              onChange={(e) => setCustomCommit(e.target.checked)}
              disabled={creating}
            />
            <div>
              <div className="text-sm text-white">Habilitar commit personalizado</div>
              <div className="text-xs text-white/60">Activa para setear un commit hash/manual.</div>
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-sm text-white/80">Nombre de la imagen</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="nombre-de-la-imagen"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              disabled={creating}
            />
            <div className="text-xs text-white/50">{nameHint}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-sm text-white/80">Tipo</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                disabled={creating}
              >
                <option value="private_image">Imagen privada</option>
                <option value="public_image">Imagen pública</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm text-white/80">Versión de Odoo</label>
              <select
                value={branchVersion}
                onChange={(e) => setBranchVersion(e.target.value as any)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                disabled={creating}
              >
                <option value="16.0">Odoo 16.0</option>
                <option value="17.0">Odoo 17.0</option>
                <option value="18.0">Odoo 18.0</option>
              </select>
            </div>

            <div className="grid gap-1 md:col-span-2">
              <label className="text-sm text-white/80">
                Commit {customCommit ? "(obligatorio)" : "(deshabilitado)"}
              </label>
              <input
                value={commit}
                onChange={(e) => setCommit(e.target.value)}
                placeholder={customCommit ? "sha, tag o selecciona de la lista" : "Habilita commit personalizado"}
                list={customCommit ? "lgd-commit-options" : undefined}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
                disabled={creating || !customCommit}
              />
              {customCommit && (
                <>
                  <datalist id="lgd-commit-options">
                    {commits.map((c) => (
                      <option
                        key={c.id}
                        value={c.commit_hash || ""}
                        label={`${c.commit_hash_short || ""} — ${c.commit_title || ""} — ${c.commit_date || ""}`}
                      />
                    ))}
                  </datalist>
                  <div className="text-xs text-white/50 mt-1">
                    {commitsLoading
                      ? "Cargando commits..."
                      : commitsErr
                        ? `No se pudieron cargar commits: ${commitsErr}`
                        : commits.length
                          ? `Sugerencias: ${commits.length} commits (version ${branchVersion})`
                          : `Sin commits guardados para ${branchVersion}`}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-sm text-white/80">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el propósito de esta imagen..."
              className="min-h-[90px] w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              disabled={creating}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            disabled={creating}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-500 disabled:opacity-60"
            disabled={creating}
            onClick={submit}
          >
            {creating ? "Creando..." : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
