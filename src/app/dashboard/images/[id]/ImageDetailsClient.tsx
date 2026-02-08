"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreateTagModal from "../CreateTagModal";
import ImageDependenciesPanel from "./ImageDependenciesPanel";
import UpdateContainersModal from "./UpdateContainersModal";

type ImageDetail = {
  id: number;
  name?: string;
  branch_version?: string;
  image_type_scope?: string;
  state?: string;
  repo_full_name?: string;
  pip_packages?: any[];
  apt_packages?: any[]; // ✅ por si existe en tu API
  description?: string;
  resume?: string;
  github_commit_id?: any;
  commit_hash?: string;
};

type ReleaseRow = {
  id: number;
  name?: string;
  ref?: string;
  create_date?: string;
  state?: string;
  sequence_number?: number;
};

function safeParseJson(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    const preview = (txt || "").replace(/\s+/g, " ").slice(0, 240);
    throw new Error(preview || "Respuesta no-JSON");
  }
}

export default function ImageDetailsClient({
  imageId,
}: {
  imageId: number;
  tab?: string; // no lo usamos, pero no rompe si lo sigues pasando
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ tab real desde URL
  const tabNow = searchParams.get("tab") || "";
  const isDeps = tabNow === "deps";
  const isHistory = tabNow === "history";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [img, setImg] = useState<ImageDetail | null>(null);

  const [showPublish, setShowPublish] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [targetRelease, setTargetRelease] = useState<ReleaseRow | null>(null);

  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releasesErr, setReleasesErr] = useState<string | null>(null);

  const [commitHash, setCommitHash] = useState("");
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsErr, setCommitsErr] = useState<string | null>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [commitSaving, setCommitSaving] = useState(false);
  const [commitSaveErr, setCommitSaveErr] = useState<string | null>(null);

  async function loadCommits(version: string) {
    setCommitsLoading(true);
    setCommitsErr(null);
    try {
      const r = await fetch(`/api/odoo/commits?version=${encodeURIComponent(version)}&limit=80`, {
        cache: "no-store",
      });
      const txt = await r.text();
      const j = JSON.parse(txt);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar commits");
      setCommits(Array.isArray(j.commits) ? j.commits : []);
    } catch (e: any) {
      setCommits([]);
      setCommitsErr(e?.message || "Error cargando commits");
    } finally {
      setCommitsLoading(false);
    }
  }

  async function saveCommit() {
    setCommitSaving(true);
    setCommitSaveErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${imageId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commit: commitHash.trim() }),
      });
      const txt = await r.text();
      const j = JSON.parse(txt);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo guardar commit");
      await load();
    } catch (e: any) {
      setCommitSaveErr(e?.message || "Error guardando commit");
    } finally {
      setCommitSaving(false);
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${imageId}`, { cache: "no-store" });
      const txt = await r.text();
      const j = safeParseJson(txt);

      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar detalle");
      const image = j.image || null;
      setImg(image);

      const ch = String(image?.commit_hash || "").trim();
      setCommitHash(ch);
      const version = String(image?.branch_version || "").trim();
      if (version) loadCommits(version);
    } catch (e: any) {
      setErr(e?.message || "Error");
      setImg(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadReleases() {
    setReleasesLoading(true);
    setReleasesErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${imageId}/releases`, {
        cache: "no-store",
      });
      const txt = await r.text();
      const j = safeParseJson(txt);

      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar releases");
      setReleases(Array.isArray(j.releases) ? j.releases : []);
    } catch (e: any) {
      setReleasesErr(e?.message || "Error releases");
      setReleases([]);
    } finally {
      setReleasesLoading(false);
    }
  }

  useEffect(() => {
    if (!imageId) return;
    load();
    loadReleases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  const badgeType = (t?: string) => {
    if (t === "public_image") return "Pública";
    if (t === "private_image") return "Privada";
    return "-";
  };

  const pip = useMemo(() => {
    if (!img?.pip_packages) return [];
    return Array.isArray(img.pip_packages) ? img.pip_packages : [];
  }, [img]);

  const apt = useMemo(() => {
    if (!img?.apt_packages) return [];
    return Array.isArray(img.apt_packages) ? img.apt_packages : [];
  }, [img]);

  const setTab = (next: "" | "deps" | "history") => {
    const base = `/dashboard/images/${imageId}`;
    router.push(next ? `${base}?tab=${next}` : base);
  };

  const badgeScope = (t?: string) => {
    if (t === "public_image") return "Pública";
    if (t === "private_image") return "Privada";
    return "-";
  };

  const scopeClass = (t?: string) => {
    if (t === "public_image") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    if (t === "private_image") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    return "border-white/15 bg-white/5 text-white/70";
  };

  const stateClass = (s?: string) => {
    if (!s) return "border-white/15 bg-white/5 text-white/70";
    const ss = String(s);
    if (/(done|success|ok|published)/i.test(ss)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    if (/(error|fail)/i.test(ss)) return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    if (/(building|running|progress)/i.test(ss)) return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    return "border-white/15 bg-white/5 text-white/70";
  };

  return (
    <div className="text-white">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-white/60 text-sm">Imagen</div>
            <h1 className="mt-1 text-2xl font-semibold truncate">
              {img?.name || `#${imageId}`}
            </h1>
            <div className="text-white/50 text-sm mt-1 break-all">
              {img?.repo_full_name || "-"}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`text-xs rounded-lg border px-2 py-1 ${scopeClass(img?.image_type_scope)}`}>
                {badgeScope(img?.image_type_scope)}
              </span>
              <span className={`text-xs rounded-lg border px-2 py-1 ${stateClass(img?.state)}`}>
                Estado: {img?.state || "-"}
              </span>
              <span className="text-xs rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-white/70">
                Versión: {img?.branch_version || "-"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              onClick={() => router.push("/dashboard/images")}
            >
              ← Volver
            </button>

            <button
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-60"
              disabled={!img}
              onClick={() => setShowPublish(true)}
            >
              Publicar
            </button>
          </div>
        </div>
      </div>

      <CreateTagModal
        opened={showPublish}
        onClose={() => setShowPublish(false)}
        templateId={img?.id || null}
        templateName={img?.name}
        defaultResume={img?.resume}
        onPublished={() => {
          load();
          loadReleases();
        }}
      />

      <UpdateContainersModal
        opened={showUpdate}
        onClose={() => {
          setShowUpdate(false);
          setTargetRelease(null);
        }}
        templateId={imageId}
        releaseId={targetRelease?.id || 0}
        releaseName={targetRelease?.name}
      />

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Columna 1-2: contenido */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Resumen</div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Tipo</div>
                <div className="mt-1 text-sm text-white/80">{badgeScope(img?.image_type_scope)}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Estado</div>
                <div className="mt-1 text-sm text-white/80">
                  {img?.state === "building"
                    ? "Construyendo"
                    : releases.length
                      ? releases[0]?.state === "publish"
                        ? `Publicado (v${releases[0]?.sequence_number ?? "?"})`
                        : releases[0]?.state === "unpublish"
                          ? `No publicado (v${releases[0]?.sequence_number ?? "?"})`
                          : `Release creado (v${releases[0]?.sequence_number ?? "?"})`
                      : "Borrador"}
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Interno: {img?.state || "-"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Versión</div>
                <div className="mt-1 text-sm text-white/80">{img?.branch_version || "-"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">ID</div>
                <div className="mt-1 text-sm text-white/80">#{img?.id ?? imageId}</div>
              </div>
            </div>
          </div>

          {img?.description && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Descripción</div>
              <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{img.description}</div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-white/60">Commit (Odoo base)</div>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                onClick={saveCommit}
                disabled={commitSaving || !img || img.image_type_scope === "public_image"}
                title={img?.image_type_scope === "public_image" ? "No editable en públicas" : "Guardar commit"}
              >
                {commitSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>

            {commitSaveErr && <div className="mt-2 text-sm text-red-300">{commitSaveErr}</div>}

            <div className="mt-2 grid gap-1">
              <input
                value={commitHash}
                onChange={(e) => setCommitHash(e.target.value)}
                placeholder="sha"
                list="lgd-commit-options-detail"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
                disabled={commitSaving || !img || img.image_type_scope === "public_image"}
              />

              <datalist id="lgd-commit-options-detail">
                {commits.map((c) => (
                  <option
                    key={c.id}
                    value={c.commit_hash || ""}
                    label={`${c.commit_hash_short || ""} — ${c.commit_title || ""} — ${c.commit_date || ""}`}
                  />
                ))}
              </datalist>

              <div className="text-xs text-white/50">
                {commitsLoading
                  ? "Cargando commits..."
                  : commitsErr
                    ? `No se pudieron cargar commits: ${commitsErr}`
                    : commits.length
                      ? `Sugerencias: ${commits.length} commits (version ${img?.branch_version || "-"})`
                      : `Sin commits guardados para ${img?.branch_version || "-"}`}
              </div>
            </div>
          </div>

          {img?.resume && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Resumen de publicación</div>
              <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{img.resume}</div>
            </div>
          )}

          {/* TABS (Dependencias / Historial) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={`rounded-xl border px-3 py-2 text-sm ${
                  !isDeps && !isHistory
                    ? "border-blue-500 bg-blue-500/20 text-blue-200"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => setTab("")}
              >
                Overview
              </button>

              <button
                className={`rounded-xl border px-3 py-2 text-sm ${
                  isDeps
                    ? "border-blue-500 bg-blue-500/20 text-blue-200"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => setTab(isDeps ? "" : "deps")}
              >
                Dependencias
              </button>

              <button
                className={`rounded-xl border px-3 py-2 text-sm ${
                  isHistory
                    ? "border-blue-500 bg-blue-500/20 text-blue-200"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => setTab(isHistory ? "" : "history")}
              >
                Historial de publicaciones
              </button>
            </div>

            {/* PANEL: DEPENDENCIAS */}
            {isDeps && (
              <div className="mt-4">
                <ImageDependenciesPanel
                  templateId={imageId}
                  onSaved={() => {
                    load();
                    loadReleases();
                  }}
                />
              </div>
            )}

            {/* PANEL: HISTORIAL */}
            {isHistory && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">Releases</div>

                  <button
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                    onClick={loadReleases}
                    disabled={releasesLoading}
                  >
                    {releasesLoading ? "Actualizando..." : "Actualizar"}
                  </button>
                </div>

                {releasesErr && <div className="mt-2 text-sm text-red-300">{releasesErr}</div>}

                {releasesLoading ? (
                  <div className="mt-2 text-sm text-white/60">Cargando...</div>
                ) : releases.length === 0 ? (
                  <div className="mt-2 text-sm text-white/60">-</div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                    <div className="bg-zinc-950/60 px-4 py-2 text-xs text-white/60">
                      RELEASE • REF • FECHA • ACCIONES
                    </div>
                    <div className="divide-y divide-white/10">
                      {releases.map((r) => (
                        <div key={r.id} className="px-4 py-3 hover:bg-white/5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.name || `#${r.id}`}</div>
                            <div className="mt-1 text-xs text-white/60 flex flex-wrap gap-3">
                              <span className="break-all">ref: {r.ref || "-"}</span>
                              <span>fecha: {r.create_date || "-"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                              onClick={() => {
                                setTargetRelease(r);
                                setShowUpdate(true);
                              }}
                            >
                              Actualizar contenedores…
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RELEASES SOLO EN OVERVIEW */}
            {!isDeps && !isHistory && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">Releases</div>

                  <button
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                    onClick={loadReleases}
                    disabled={releasesLoading}
                  >
                    {releasesLoading ? "Actualizando..." : "Actualizar"}
                  </button>
                </div>

                {releasesErr && <div className="mt-2 text-sm text-red-300">{releasesErr}</div>}

                {releasesLoading ? (
                  <div className="mt-2 text-sm text-white/60">Cargando...</div>
                ) : releases.length === 0 ? (
                  <div className="mt-2 text-sm text-white/60">-</div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                    <div className="bg-zinc-950/60 px-4 py-2 text-xs text-white/60">
                      NOMBRE • REF • FECHA
                    </div>
                    <div className="divide-y divide-white/10">
                      {releases.map((r) => (
                        <div key={r.id} className="px-4 py-3 hover:bg-white/5">
                          <div className="font-medium">{r.name || `#${r.id}`}</div>
                          <div className="mt-1 text-xs text-white/60 flex flex-wrap gap-3">
                            <span>ref: {r.ref || "-"}</span>
                            <span>fecha: {r.create_date || "-"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: deps */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">PIP</div>
            {pip.length === 0 ? (
              <div className="text-sm text-white/60 mt-2">-</div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {pip
                  .map((p: any) => String(p?.[1] || p?.name || p))
                  .sort((a, b) => a.localeCompare(b))
                  .map((label, idx) => (
                    <span
                      key={idx}
                      className="text-xs rounded-full border border-white/20 bg-black/20 px-2 py-1 text-white/70"
                    >
                      {label}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">APT</div>
            {apt.length === 0 ? (
              <div className="text-sm text-white/60 mt-2">-</div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {apt
                  .map((p: any) => String(p?.[1] || p?.name || p))
                  .sort((a, b) => a.localeCompare(b))
                  .map((label, idx) => (
                    <span
                      key={idx}
                      className="text-xs rounded-full border border-white/20 bg-black/20 px-2 py-1 text-white/70"
                    >
                      {label}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="mt-4 text-sm text-white/60">Cargando detalle...</div>}
    </div>
  );
}
