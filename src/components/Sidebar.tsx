"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

const items = [
  { href: "/dashboard", label: "Proyectos", icon: "📁" },
  { href: "/dashboard/images", label: "Imágenes", icon: "🧱" },
  { href: "/dashboard/licenses", label: "Licencias", icon: "🪪" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [token, setToken] = useState<string | null>(null);
  const [tokenErr, setTokenErr] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const loadToken = async () => {
    try {
      setTokenLoading(true);
      setTokenErr(null);
      const r = await fetch("/api/odoo/me/token-lgd");
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);
      const tok = String(d.token_lgd || "");
      setToken(tok);
      try {
        if (tok) window.localStorage.setItem("lgd_token_lgd", tok);
      } catch {
        // ignore
      }
    } catch (e: any) {
      setToken(null);
      setTokenErr(e?.message || "No se pudo cargar token");
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    // Token is long-lived per user. Avoid fetching on every navigation.
    // Best-effort: restore from localStorage if present.
    try {
      const cached = window.localStorage.getItem("lgd_token_lgd") || "";
      if (cached) setToken(cached);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="p-4 border-t border-white/5 space-y-3">
        <button
          type="button"
          onClick={async () => {
            try {
              // Línea directa (sin modo seguro): descarga bootstrap y lo ejecuta.
              // Nota: el param se llama token pero el valor es token_lgd.
              const cmd = token
                ? `curl -fsSL "${window.location.origin}/api/agent/bootstrap?token=${token}" | bash`
                : `curl -fsSL "${window.location.origin}/api/agent/bootstrap" | bash`;
              await navigator.clipboard.writeText(cmd);
            } catch {
              // ignore
            }
          }}
          className="group w-full flex items-center justify-between rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-100 border border-blue-500/30 px-3 py-2 text-xs font-mono transition-colors disabled:opacity-60"
          title={token ? "Copiar comando de instalación (incluye token_lgd)" : "Copiar comando de instalación"}
          disabled={tokenLoading}
        >
          <span className="flex items-center gap-2">
            <span className="text-sm">⬇</span>
            Copy install command
          </span>
          <span className="text-[10px] text-blue-100/60">curl|bash</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            if (!token) {
              await loadToken();
              return;
            }
            await navigator.clipboard.writeText(token);
          }}
          className="group w-full flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 px-3 py-2 text-xs font-mono transition-colors disabled:opacity-60"
          title={token ? "Copiar token_lgd" : "Cargar token_lgd"}
          disabled={tokenLoading}
        >
          <span className="flex items-center gap-2">
            <span className="text-sm">🔑</span>
            {token ? "Copy token" : tokenLoading ? "Loading..." : "Get token"}
          </span>
          <span className="text-[10px] text-white/40">
            {token ? `${token.slice(0, 6)}…${token.slice(-4)}` : tokenErr ? "ERR" : ""}
          </span>
        </button>

        {tokenErr ? (
          <div className="text-[10px] text-rose-300/70 font-mono px-1">
            {tokenErr}
          </div>
        ) : null}

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
