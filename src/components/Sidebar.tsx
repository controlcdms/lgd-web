"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Proyectos", icon: "📁" },
  { href: "/dashboard/images", label: "Imágenes", icon: "🧱" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 shrink-0 border-r border-white/5 bg-[#0c0c0e] relative flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
          <div className="text-white font-bold text-lg tracking-tight">LetsGoDeploy</div>
        </div>
        <div className="text-white/30 text-[10px] uppercase font-mono tracking-widest pl-5">Mission Control v2.0</div>
      </div>

      <nav className="px-3 py-2 flex-1 space-y-1">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");

          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-white/5 text-white border border-white/10 shadow-lg shadow-black/20"
                  : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent",
              ].join(" ")}
            >
              <span className={`text-base transition-transform group-hover:scale-110 ${active ? 'grayscale-0' : 'grayscale opacity-70'}`}>{it.icon}</span>
              <span className="font-medium">{it.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="rounded-xl bg-white/5 p-3 flex items-center gap-3 border border-white/5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            OP
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-medium text-white truncate">Operator</div>
            <div className="text-[10px] text-white/40 truncate">System Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
