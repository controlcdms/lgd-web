"use client";

import { useMemo, useState } from "react";
import type { LicenseType } from "@/lib/licenses";
import { LICENSE_META } from "@/lib/licenses";

type CreateOrderResult =
  | { ok: true; order: { id: number; name?: string; state?: string; amount_total?: number }; reference?: string }
  | { ok: false; error: string };

export default function LicensesPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LicenseType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const selectedMeta = useMemo(() => {
    if (!selected) return null;
    return LICENSE_META[selected] || null;
  }, [selected]);

  async function createOrder(type: LicenseType) {
    setBusy(true);
    setError(null);
    setOrderRef(null);

    try {
      const r = await fetch("/api/odoo/licenses/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, months: 1 }),
      });
      const d = (await r.json().catch(() => ({}))) as CreateOrderResult;

      if (!r.ok || (d as any)?.ok === false) {
        throw new Error((d as any)?.error || `HTTP ${r.status}`);
      }

      setOrderRef((d as any)?.reference || (d as any)?.order?.name || null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Licencias</h1>
            <div className="text-white/60 mt-1">
              Compra y administra tus licencias mensuales. (MVP: transferencia bancaria)
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
          <div className="text-sm font-medium">Estado</div>
          <div className="text-sm text-white/60 mt-1">
            Próximamente verás aquí: total / en uso / disponibles por tipo.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {(Object.entries(LICENSE_META) as Array<[LicenseType, typeof LICENSE_META[LicenseType]]>).map(
            ([type, meta]) => (
              <div
                key={type}
                className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-5"
              >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold tracking-tight">{meta.title}</div>
                  <div className="text-sm text-white/60 mt-1">{meta.desc}</div>
                </div>
                <div className="text-[10px] font-mono text-white/40 border border-white/10 rounded px-2 py-1">
                  mensual
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  className="rounded-xl bg-blue-600/90 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                  disabled={busy}
                  onClick={() => {
                    setSelected(type);
                    setOpen(true);
                    void createOrder(type);
                  }}
                >
                  {busy && selected === type ? "Creando…" : "Comprar 1 mes"}
                </button>

                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => {
                    setSelected(type);
                    setOpen(true);
                    void createOrder(type);
                  }}
                >
                  Renovar
                </button>
              </div>
            </div>
          ))}
        </div>

        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c0c0e] p-6 shadow-2xl ring-1 ring-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold tracking-tight">
                    Pago por transferencia
                  </div>
                  <div className="text-sm text-white/60 mt-1">
                    {selectedMeta?.title || "Licencia"} — 1 mes
                  </div>
                </div>
                <button
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium">Instrucciones (transferencia)</div>

                <div className="mt-2 text-sm text-white/70">
                  {busy ? (
                    <div>Creando orden en Odoo…</div>
                  ) : orderRef ? (
                    <div>
                      Orden creada: <span className="font-mono text-white/90">{orderRef}</span>
                    </div>
                  ) : error ? (
                    <div className="text-red-300">Error: {error}</div>
                  ) : (
                    <div>Listo para generar la orden.</div>
                  )}
                </div>

                <ul className="mt-3 text-sm text-white/70 space-y-1 list-disc pl-5">
                  <li>Banco: (pendiente)</li>
                  <li>Cuenta / CCI: (pendiente)</li>
                  <li>Titular: (pendiente)</li>
                  <li>Monto: (pendiente)</li>
                  <li>
                    Concepto: {" "}
                    <span className="font-mono text-white/90">
                      {orderRef ? orderRef : `LGD-LIC-${selected}`}
                    </span>
                  </li>
                </ul>

                <div className="mt-3 text-xs text-white/50">
                  MVP: por ahora el pago es manual. Cuando se marque como pagada en Odoo,
                  aquí podrás ver el estado sin salir de Next.
                </div>

                {!!error && selected && (
                  <div className="mt-3">
                    <button
                      className="rounded-xl bg-blue-600/90 hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      disabled={busy}
                      onClick={() => void createOrder(selected)}
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
