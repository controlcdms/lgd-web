"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AgentTools() {
  const { data: session } = useSession();
  const githubLogin = (session?.user as any)?.githubLogin as string | undefined;

  const [token, setToken] = useState<string | null>(null);
  const [tokenErr, setTokenErr] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [registryHost, setRegistryHost] = useState<string>("registry.letsgodeploy.com");
  const [registryUser, setRegistryUser] = useState<string>("");
  const [registryPass, setRegistryPass] = useState<string>("");
  const [registryErr, setRegistryErr] = useState<string | null>(null);
  const [registryLoading, setRegistryLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    const loadRegistryCreds = async () => {
      try {
        setRegistryLoading(true);
        setRegistryErr(null);
        const r = await fetch("/api/odoo/me/registry-creds", { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);
        if (!cancelled) {
          setRegistryHost(String(d.registry || "registry.letsgodeploy.com"));
          setRegistryUser(String(d.username || ""));
          setRegistryPass(String(d.password || ""));
        }
      } catch (e: any) {
        if (!cancelled) {
          setRegistryErr(e?.message || "No se pudo cargar credenciales de registry");
        }
      } finally {
        if (!cancelled) setRegistryLoading(false);
      }
    };
    loadRegistryCreds();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Agent install</h2>
          <p className="text-xs text-white/40 font-mono mt-1">
            Comandos para descargar e instalar el agente local.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100 space-y-3">
          <div>
            <div className="font-semibold">Antes del primer deploy local</div>
            <div className="mt-1 text-amber-100/80">
              Si el proyecto usa imágenes privadas, inicia sesión una vez en el registry desde tu máquina.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-amber-200/70">Registry</div>
              <div className="rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-amber-50 select-all break-all">
                {registryHost}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-amber-200/70">Usuario</div>
              <div className="rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-amber-50 select-all break-all">
                {registryLoading ? "Cargando..." : registryUser || "No disponible"}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-amber-200/70">Clave</div>
            <div className="rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-amber-50 select-all break-all">
              {registryLoading ? "Cargando..." : registryPass || "No disponible"}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-amber-200/70">Linux / macOS</div>
            <div className="rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-amber-50 select-all break-all">
              {`docker login ${registryHost}${registryUser ? ` -u ${registryUser}` : ""}`}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-amber-200/70">Windows PowerShell</div>
            <div className="rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-amber-50 select-all break-all">
              {`docker login ${registryHost}${registryUser ? ` -u ${registryUser}` : ""}`}
            </div>
          </div>

          {registryErr ? (
            <div className="text-[10px] text-rose-200/80 font-mono">
              {registryErr}
            </div>
          ) : null}
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
