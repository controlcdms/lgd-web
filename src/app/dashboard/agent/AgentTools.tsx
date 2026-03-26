"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AgentTools() {
  const { data: session } = useSession();
  const githubLogin = (session?.user as any)?.githubLogin as string | undefined;

  const [token, setToken] = useState<string | null>(null);
  const [tokenErr, setTokenErr] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const tokenKey = (login?: string | null) => `lgd_token_lgd:${login || ""}`;

  const loadToken = async (rotate = false) => {
    try {
      setTokenLoading(true);
      setTokenErr(null);
      const url = rotate ? "/api/odoo/me/token-lgd?rotate=1" : "/api/odoo/me/token-lgd";
      const r = await fetch(url);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);
      const tok = String(d.token_lgd || "");
      setToken(tok);
      try {
        if (tok) window.localStorage.setItem(tokenKey(githubLogin), tok);
      } catch {
        // ignore
      }
      return tok;
    } catch (e: any) {
      setToken(null);
      setTokenErr(e?.message || "No se pudo cargar token");
      return null;
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(tokenKey(githubLogin)) || "";
      if (cached) setToken(cached);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubLogin]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Agent install</h2>
          <p className="text-xs text-white/40 font-mono mt-1">
            Comandos para descargar e instalar el agente local.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const cacheBust = Date.now();
                const cmd = token
                  ? `curl -fsSL "${window.location.origin}/api/agent/bootstrap?token=${token}&v=${cacheBust}" | bash`
                  : `curl -fsSL "${window.location.origin}/api/agent/bootstrap?v=${cacheBust}" | bash`;
                await navigator.clipboard.writeText(cmd);
              } catch {
                // ignore
              }
            }}
            className="group w-full flex items-center justify-between rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-100 border border-blue-500/30 px-3 py-2 text-xs font-mono transition-colors disabled:opacity-60"
            title={token ? "Copiar comando Linux (incluye token_lgd)" : "Copiar comando Linux"}
            disabled={tokenLoading}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">🐧</span>
              Copy Linux command
            </span>
            <span className="text-[10px] text-blue-100/60">curl|bash</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                const cacheBust = Date.now();
                const cmd = token
                  ? `powershell -ExecutionPolicy Bypass -Command "iwr -useb '${window.location.origin}/api/agent/bootstrap-windows?token=${token}&v=${cacheBust}' | iex"`
                  : `powershell -ExecutionPolicy Bypass -Command "iwr -useb '${window.location.origin}/api/agent/bootstrap-windows?v=${cacheBust}' | iex"`;
                await navigator.clipboard.writeText(cmd);
              } catch {
                // ignore
              }
            }}
            className="group w-full flex items-center justify-between rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-100 border border-blue-500/30 px-3 py-2 text-xs font-mono transition-colors disabled:opacity-60"
            title={token ? "Copiar comando Windows (incluye token_lgd)" : "Copiar comando Windows"}
            disabled={tokenLoading}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">🪟</span>
              Copy Windows command
            </span>
            <span className="text-[10px] text-blue-100/60">powershell</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Agent token</h2>
          <p className="text-xs text-white/40 font-mono mt-1">
            Copia o regenera el token LGD del usuario.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={async () => {
              const t = await loadToken(false);
              if (t) await navigator.clipboard.writeText(t);
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

          <button
            type="button"
            onClick={async () => {
              const t = await loadToken(true);
              if (t) await navigator.clipboard.writeText(t);
            }}
            className="group w-full flex items-center justify-between rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 px-3 py-2 text-xs font-mono transition-colors disabled:opacity-60"
            title="Regenerar token_lgd"
            disabled={tokenLoading}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">♻</span>
              Regenerar token
            </span>
            <span className="text-[10px] text-amber-200/60">rotate</span>
          </button>
        </div>

        {tokenErr ? (
          <div className="text-[10px] text-rose-300/70 font-mono px-1 mt-2">
            {tokenErr}
          </div>
        ) : null}
      </div>
    </div>
  );
}
