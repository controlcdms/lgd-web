"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";

const items = [
  { href: "/dashboard", key: "nav.projects", icon: "📁" },
  { href: "/dashboard/images", key: "nav.images", icon: "🧱" },
  { href: "/dashboard/licenses", key: "nav.licenses", icon: "🪪" },
  { href: "/dashboard/agent", key: "nav.agent", icon: "🔑" },
] as const;

function withLocalePrefix(pathname: string, href: string) {
  const m = pathname.match(/^\/(en|es)(\/|$)/);
  const locale = m?.[1];
  return locale ? `/${locale}${href}` : href;
}

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session } = useSession();
  const githubLogin = (session?.user as any)?.githubLogin as string | undefined;
  const displayName = session?.user?.name || githubLogin || session?.user?.email || "";


  return (
    <aside className="hidden md:flex h-screen w-64 shrink-0 border-r border-white/5 bg-[#0c0c0e] relative flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
          <div className="text-white font-bold text-lg tracking-tight">LetsGoDeploy</div>
        </div>
        <div className="text-white/30 text-[10px] uppercase font-mono tracking-widest pl-5">Mission Control v2.0</div>
      </div>

      {displayName ? (
        <div className="mx-4 mb-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Usuario</div>
          <div className="text-sm text-white/90 truncate">{displayName}</div>
          {githubLogin && displayName !== githubLogin ? (
            <div className="text-xs text-white/50 truncate">@{githubLogin}</div>
          ) : null}
        </div>
      ) : null}

      <nav className="px-3 py-2 flex-1 space-y-1">
        {items.map((it) => {
          const href = withLocalePrefix(pathname, it.href);
          const active = pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={it.href}
              href={href}
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent("lgd:navigate", { detail: { href } }));
                } catch {
                  // ignore
                }
              }}
              className={[
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-white/5 text-white border border-white/10 shadow-lg shadow-black/20"
                  : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent",
              ].join(" ")}
            >
              <span className={`text-base transition-transform group-hover:scale-110 ${active ? 'grayscale-0' : 'grayscale opacity-70'}`}>{it.icon}</span>
              <span className="font-medium">{t(it.key)}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="group w-full flex items-center justify-between rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-100 border border-rose-500/20 px-3 py-2 text-xs font-mono transition-colors"
          title="Cerrar sesión"
        >
          <span className="flex items-center gap-2">
            <span className="text-sm">↩</span>
            Sign out
          </span>
          <span className="text-[10px] text-rose-100/60">logout</span>
        </button>
      </div>
    </aside>
  );
}
