export default function Loading() {
  return (
    <main className="min-h-screen p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">LGD Dashboard</h1>
          <div className="text-sm text-white/60">Cargando…</div>
        </div>

        <div className="mb-4">
          <div className="h-10 w-full max-w-xl rounded-xl border border-white/10 bg-white/5" />
        </div>

        <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">
          Cargando proyectos…
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="h-5 w-2/3 rounded bg-white/10 mb-3" />
              <div className="h-4 w-1/2 rounded bg-white/10 mb-6" />
              <div className="h-2 w-full rounded bg-white/10 mb-2" />
              <div className="h-2 w-5/6 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
