"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CreateImageModal from "./CreateImageModal";
import CreateTagModal from "./CreateTagModal";

type ImageRow = {
  id: number;
  name?: string;
  branch_version?: string;      // “18.0”
  image_type_scope?: string;    // private_image / public_image
  state?: string;              // release/building/etc
  repo_full_name?: string;
  pip_packages?: any[];
  resume?: string;
};

export default function ImagesClient() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [images, setImages] = useState<ImageRow[]>([]);

  const [showNewImage, setShowNewImage] = useState(false);

  // publish modal (solo para publicar, no para detalle)
  const [publishTarget, setPublishTarget] = useState<{
    id: number;
    name: string;
    resume?: string;
  } | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/odoo/images", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo cargar imágenes");
      setImages(j.images || []);
    } catch (e: any) {
      setErr(e?.message || "Error cargando imágenes");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return images;
    return images.filter((x) => {
      const a = (x.name || "").toLowerCase();
      const b = (x.branch_version || "").toLowerCase();
      const c = (x.image_type_scope || "").toLowerCase();
      const d = (x.repo_full_name || "").toLowerCase();
      return a.includes(s) || b.includes(s) || c.includes(s) || d.includes(s);
    });
  }, [q, images]);

  const total = images.length;
  const publicCount = images.filter((x) => x.image_type_scope === "public_image").length;
  const privateCount = images.filter((x) => x.image_type_scope === "private_image").length;

  const badgeType = (t?: string) => {
    if (t === "public_image") return "Pública";
    if (t === "private_image") return "Privada";
    return "-";
  };

  function goDetail(id: number) {
    router.push(`/dashboard/images/${id}`);
  }

  return (
    <div className="text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Imágenes de Docker</h1>
          <div className="text-white/60 mt-1">Tus templates / imágenes base</div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-xl bg-green-600 px-3 py-2 text-sm hover:bg-green-500"
            onClick={() => setShowNewImage(true)}
          >
            + Nueva imagen
          </button>
        </div>
      </div>

      <CreateImageModal
        open={showNewImage}
        onClose={() => setShowNewImage(false)}
        onCreated={() => load()}
      />

      <CreateTagModal
        opened={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        templateId={publishTarget?.id || null}
        templateName={publishTarget?.name}
        defaultResume={publishTarget?.resume}
        onPublished={() => load()}
      />

      
      

      {/* search */}
      <div className="mt-5 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar imagen..."
          className="w-full max-w-xl rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
        <div className="text-xs text-white/60">
          {filtered.length}/{images.length}
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* list */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <div className="bg-zinc-950/60 px-4 py-3 text-xs text-white/60">
          NOMBRE • VERSIÓN • ESTADO • TIPO • ACCIONES
        </div>

        {loading ? (
          <div className="p-4 text-white/70">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-white/70">No hay imágenes.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((img) => (
              <div
                key={img.id}
                className="p-4 bg-white/5 hover:bg-white/10 cursor-pointer"
                onClick={() => goDetail(img.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-lg truncate">
                      {img.name || `#${img.id}`}
                    </div>

                    {/* <div className="text-xs text-white/50 mt-1 truncate">
                      {img.repo_full_name || "-"}
                    </div> */}

                    {Array.isArray(img.pip_packages) && img.pip_packages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {img.pip_packages.slice(0, 12).map((p: any, idx: number) => (
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

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs rounded-lg border border-white/15 bg-white/5 px-2 py-1">
                      {img.branch_version || "-"}
                    </span>

                    <span className="text-xs rounded-lg border border-white/15 bg-white/5 px-2 py-1">
                      {img.state || "release"}
                    </span>

                    <span className="text-xs rounded-lg border border-white/15 bg-white/5 px-2 py-1">
                      {badgeType(img.image_type_scope)}
                    </span>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
