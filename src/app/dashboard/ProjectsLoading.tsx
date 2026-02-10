export default function ProjectsLoading({ title }: { title?: string }) {
  return (
    <div className="text-white">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xl">
          <div className="h-10 w-full rounded-xl border border-white/10 bg-white/5" />
        </div>
        <div className="rounded-xl bg-blue-600/30 px-4 py-2.5 text-sm text-white/80 border border-blue-500/30">
          {title || "Cargando…"}
        </div>
      </div>

      <div className="mb-4 text-xs font-mono text-white/40 uppercase tracking-widest pl-1">
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
  );
}
