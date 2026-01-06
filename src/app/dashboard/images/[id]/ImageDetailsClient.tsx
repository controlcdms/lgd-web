"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CreateTagModal from "../CreateTagModal";

type ImageDetail = {
  id: number;
  name?: string;
  branch_version?: string;
  image_type_scope?: string;
  state?: string;
  repo_full_name?: string;
  pip_packages?: any[];
  description?: string;
  resume?: string;
};

type ReleaseRow = {
  id: number;
  name?: string;
  ref?: string;
  create_date?: string;
};

export default function ImageDetailsClient({
  imageId,
  tab,
}: {
  imageId: number;
  tab?: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [img, setImg] = useState<ImageDetail | null>(null);

  const [showPublish, setShowPublish] = useState(false);

  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releasesErr, setReleasesErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/odoo/images/${imageId}`, { cache: "no-store" });

      // ✅ si backend devuelve HTML por error, esto te salva del JSON.parse roto
      const txt = await r.text();
      let j: any = null;
      try {
        j = JSON.parse(txt);
      } catch {
        throw new Error(txt?.slice(0, 200) || "Respuesta no-JSON");
      }

      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar detalle");
      setImg(j.image || null);
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
      let j: any = null;
      try {
        j = JSON.parse(txt);
      } catch {
        throw new Error(txt?.slice(0, 200) || "Respuesta no-JSON");
      }

      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar releases");
      setReleases(j.releases || []);
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

  return (
    <div className="text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white/60 text-sm">Imagen</div>
          <h1 className="text-2xl font-semibold">{img?.name || `#${imageId}`}</h1>
          <div className="text-white/50 text-sm mt-1">{img?.repo_full_name || "-"}</div>
        </div>

        <div className="flex items-center gap-2">
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

          <button
            className="rounded-xl bg-red-600 px-3 py-2 text-sm hover:bg-red-500 disabled:opacity-60"
            disabled={!img}
            onClick={() => alert("Eliminar: luego conectamos endpoint")}
          >
            Eliminar
          </button>
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

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* LEFT */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Detalles</div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs rounded-lg border border-white/15 bg-white/5 px-2 py-1">
              Versión: {img?.branch_version || "-"}
            </span>
            <span className="text-xs rounded-lg border border-white/15 bg-white/5 px-2 py-1">
              Estado: {img?.state || "-"}
            </span>
            <span className="text-xs rounded-lg border border-white/15 bg-white/5 px-2 py-1">
              Tipo: {badgeType(img?.image_type_scope)}
            </span>
          </div>

          {img?.description && (
            <div className="mt-4">
              <div className="text-sm text-white/60">Descripción</div>
              <div className="mt-1 text-sm text-white/80 whitespace-pre-wrap">
                {img.description}
              </div>
            </div>
          )}

          <div className="mt-5">
            <div className="text-sm text-white/60">PIP</div>
            {pip.length === 0 ? (
              <div className="text-sm text-white/60 mt-2">-</div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {pip.map((p: any, idx: number) => (
                  <span
                    key={idx}
                    className="text-xs rounded-full border border-white/20 bg-white/5 px-2 py-1 text-white/70"
                  >
                    {String(p?.[1] || p?.name || p)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RELEASES */}
          <div className="mt-6">
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

            {releasesErr && (
              <div className="mt-2 text-sm text-red-300">{releasesErr}</div>
            )}

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
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">Acciones</div>

          <div className="mt-3 grid gap-2">
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              onClick={() => alert("Dependencias: luego conectamos")}
            >
              Dependencias
            </button>

            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              onClick={() => alert("Historial: luego conectamos")}
            >
              Historial de publicaciones
            </button>
          </div>

          {tab === "deps" && (
            <div className="mt-4 text-sm text-white/60">
              (tab=deps) acá luego metemos el panel de dependencias.
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-white/60">Cargando detalle...</div>
      )}
    </div>
  );
}
