"use client";

import { useEffect } from "react";

type ImageRow = {
  id: number;
  name?: string;
  branch_version?: string;
  image_type_scope?: string;
  state?: string;
  repo_full_name?: string;
  pip_packages?: any;
};

export default function ImageDetailsModal({
  open,
  image,
  onClose,
  onPublish,
  onDeps,
  onDelete,
}: {
  open: boolean;
  image: ImageRow | null;
  onClose: () => void;
  onPublish?: (img: ImageRow) => void;
  onDeps?: (img: ImageRow) => void;
  onDelete?: (img: ImageRow) => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !image) return null;

  const badgeType = (t?: string) => {
    if (t === "public_image") return "Pública";
    if (t === "private_image") return "Privada";
    return "-";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70" onClick={onClose}>
      <div
        className="absolute inset-0 m-0 md:m-6 rounded-none md:rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">
              {image.name || `Imagen #${image.id}`}
            </div>
            <div className="text-xs text-white/60 mt-1 truncate">
              {image.repo_full_name || "-"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              onClick={onClose}
            >
              Cerrar (Esc)
            </button>
          </div>
        </div>

        {/* content */}
        <div className="h-[calc(100vh-72px)] md:h-[calc(100vh-72px-48px)] overflow-auto p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* left: main */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70">Detalles</div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
                  <div className="text-xs text-white/60">Versión</div>
                  <div className="mt-1 font-medium">{image.branch_version || "-"}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
                  <div className="text-xs text-white/60">Estado</div>
                  <div className="mt-1 font-medium">{image.state || "-"}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
                  <div className="text-xs text-white/60">Tipo</div>
                  <div className="mt-1 font-medium">{badgeType(image.image_type_scope)}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
                  <div className="text-xs text-white/60">ID</div>
                  <div className="mt-1 font-medium">#{image.id}</div>
                </div>
              </div>

              {/* pip packages */}
              <div className="mt-5">
                <div className="text-sm text-white/70">PIP packages</div>

                {Array.isArray(image.pip_packages) && image.pip_packages.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {image.pip_packages.map((p: any, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs rounded-full border border-white/15 bg-white/5 px-2 py-1 text-white/80"
                      >
                        {String(p?.[1] || p?.name || p)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-white/50">-</div>
                )}
              </div>

              {/* placeholder for history */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
                <div className="text-sm text-white/70">Historial de publicaciones</div>
                <div className="mt-2 text-sm text-white/50">
                  (Aquí luego metemos la tabla de tags/releases)
                </div>
              </div>
            </div>

            {/* right: actions */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70">Acciones</div>

              <div className="mt-4 grid gap-2">
                <button
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500"
                  onClick={() => onPublish?.(image)}
                >
                  Publicar
                </button>

                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  onClick={() => onDeps?.(image)}
                >
                  Dependencias
                </button>

                <button
                  className="rounded-xl bg-red-600 px-3 py-2 text-sm hover:bg-red-500"
                  onClick={() => onDelete?.(image)}
                >
                  Eliminar
                </button>
              </div>

              <div className="mt-4 text-xs text-white/50">
                Tip: click afuera o Esc para cerrar.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
