"use client";

import { useMemo, useState } from "react";

type LicenseType = "prod_premium" | "prod_simple" | "staging_simple" | "testing";

const LICENSES: Array<{
  type: LicenseType;
  title: string;
  desc: string;
}> = [
  {
    type: "prod_premium",
    title: "Producción Premium",
    desc: "Instancias productivas (plan Premium). 1 licencia = 1 instancia running.",
  },
  {
    type: "prod_simple",
    title: "Producción Simple",
    desc: "Instancias productivas (plan Simple). 1 licencia = 1 instancia running.",
  },
  {
    type: "staging_simple",
    title: "Staging",
    desc: "Entorno de staging (equivale a Simple). 1 licencia = 1 instancia running.",
  },
  {
    type: "testing",
    title: "Testing",
    desc: "Entorno de testing. 1 licencia = 1 instancia running.",
  },
];

export default function LicensesPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LicenseType | null>(null);

  const selectedMeta = useMemo(() => {
    if (!selected) return null;
    return LICENSES.find((x) => x.type === selected) || null;
  }, [selected]);

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
          {LICENSES.map((l) => (
            <div key={l.type} className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold tracking-tight">{l.title}</div>
                  <div className="text-sm text-white/60 mt-1">{l.desc}</div>
                </div>
                <div className="text-[10px] font-mono text-white/40 border border-white/10 rounded px-2 py-1">
                  mensual
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  className="rounded-xl bg-blue-600/90 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => {
                    setSelected(l.type);
                    setOpen(true);
                  }}
                >
                  Comprar 1 mes
                </button>

                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => {
                    setSelected(l.type);
                    setOpen(true);
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
                <div className="text-sm font-medium">Instrucciones (genéricas)</div>
                <ul className="mt-2 text-sm text-white/70 space-y-1 list-disc pl-5">
                  <li>Banco: (pendiente)</li>
                  <li>Cuenta / CCI: (pendiente)</li>
                  <li>Titular: (pendiente)</li>
                  <li>Monto: (pendiente)</li>
                  <li>
                    Concepto: <span className="font-mono text-white/90">LGD-LIC-{selected}</span>
                  </li>
                </ul>
                <div className="mt-3 text-xs text-white/50">
                  En el siguiente paso esto generará una orden y podrás ver el estado
                  (pendiente / pagado) sin salir de Next.
                </div>
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
