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
    <aside className="h-screen w-64 shrink-0 border-r border-white/10 bg-zinc-950 relative">
      <div className="p-4">
        <div className="text-white font-semibold text-lg">LetsGoDeploy</div>
        <div className="text-white/50 text-xs mt-1">LGD Dashboard</div>
      </div>

      <nav className="px-3 py-2">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");

          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-blue-600/20 text-blue-200 border border-blue-500/30"
                  : "text-white/80 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <span className="text-base">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
