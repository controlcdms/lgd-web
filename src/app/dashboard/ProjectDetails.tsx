"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  TextInput,
  Select,
  Alert,
  Group,
  Stack,
  Loader,
} from "@mantine/core";

type Branch = {
  id: number;
  name: string;
  type_deploy?: string;
  branch_status?: string;
  container_status?: string;
  user_id?: any;
  container_id?: any;
  release_id?: any;
  current_docker_image?: string | null;
  other_server_docker_image?: string | null;
  jenkins_url_html?: string | null;
  instructions_dev?: string | null;
  server_url_nginx?: string | null;
};

type DeployType =
  | "staging_deploy"
  | "testing_deploy"
  | "local_deploy"
  | "production_deploy";

type ActionKind = "start" | "stop" | "expire";

type DefaultsResp = {
  ok: boolean;
  error?: string;
  defaults?: {
    base_version?: { id: number | false; name: string | false };
    release_default?: { id: number | false; name: string | false };
    releases?: { id: number; name: string }[];
    license?: { id: number | false; name: string | false };
    server?: { id: number | false; name: string | false };
  };
};

function validateBranchName(name: string) {
  const v = name.trim();
  if (!v) return "Ponle nombre a la rama";
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(v)) {
    return "Solo letras, números, - o _ (no empieza con número)";
  }
  return null;
}

export default function ProjectDetails({ projectId }: { projectId: number | null }) {
  // data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ acciones por rama (SIN nulls)
  const [busy, setBusy] = useState<Partial<Record<number, ActionKind>>>({});
  const isBusy = (branchId: number) => busy[branchId] !== undefined;

  // crear rama
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<DeployType>("staging_deploy");
  const [creating, setCreating] = useState(false);
  const [creatingProd, setCreatingProd] = useState(false);

  // nicer confirm modal (avoid browser confirm)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<null | (() => void | Promise<void>)>(null);

  // commits modal
  const [commitsOpen, setCommitsOpen] = useState(false);
  const [commitsBranch, setCommitsBranch] = useState<{ id: number; name: string } | null>(null);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsErr, setCommitsErr] = useState<string | null>(null);
  const [commitsRows, setCommitsRows] = useState<any[]>([]);

  // logs modal
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsBranch, setLogsBranch] = useState<{ id: number; name: string } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsErr, setLogsErr] = useState<string | null>(null);
  const [logsText, setLogsText] = useState<string>("");
  const [logsAuto, setLogsAuto] = useState(true);

  const openConfirm = (msg: string, action: () => void | Promise<void>) => {
    setConfirmMsg(msg);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  async function loadBranchCommits(branchId: number) {
    setCommitsLoading(true);
    setCommitsErr(null);
    try {
      const r = await fetch(`/api/odoo/branches/${branchId}/commits?limit=20`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      setCommitsRows(Array.isArray(j.commits) ? j.commits : []);
    } catch (e: any) {
      setCommitsRows([]);
      setCommitsErr(e?.message || "Error cargando commits");
    } finally {
      setCommitsLoading(false);
    }
  }

  async function loadBranchLogs(branchId: number, opts?: { silent?: boolean }) {
    const silent = Boolean(opts?.silent);

    if (!silent) {
      setLogsLoading(true);
      setLogsErr(null);
      setLogsText("");
    }

    try {
      const r = await fetch(`/api/satellite/branches/${branchId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ service: "odoo", tail: 400 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);

      // Backend returns JSON-RPC envelope (j.result.logs) but keep compatibility if it ever returns j.logs.
      const logs =
        typeof j?.result?.logs === "string"
          ? j.result.logs
          : typeof j?.logs === "string"
            ? j.logs
            : "";

      setLogsErr(null);
      setLogsText(logs);
    } catch (e: any) {
      if (!silent) setLogsText("");
      setLogsErr(e?.message || "Error cargando logs");
    } finally {
      if (!silent) setLogsLoading(false);
    }
  }

  // defaults de Odoo para mostrar versión/release
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [baseVersionName, setBaseVersionName] = useState<string | null>(null);
  const [releaseOptions, setReleaseOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);

  const resetCreateState = () => {
    setShowCreate(false);
    setNewName("");
    setNewType("staging_deploy");
    setDefaultsLoading(false);
    setBaseVersionName(null);
    setReleaseOptions([]);
    setSelectedReleaseId(null);
  };

  const reload = () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/odoo/projects/${projectId}/branches`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        return d;
      })
      .then((d) => setBranches(d?.branches || []))
      .catch((e) => {
        setBranches([]);
        setError(e?.message || "Error cargando ramas");
      })
      .finally(() => setLoading(false));
  };

  // ✅ cargar ramas al cambiar projectId
  useEffect(() => {
    // importantísimo: limpiar busy al cambiar de proyecto
    setBusy({});

    if (!projectId) {
      setBranches([]);
      setLoading(false);
      setError(null);
      resetCreateState();
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    // Fast load first (no container enrichment). Enrichment is requested in background.
    fetch(`/api/odoo/projects/${projectId}/branches`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        return d;
      })
      .then((d) => {
        const base = d?.branches || [];
        setBranches(base);

        // Background enrich (release/image) without blocking UI
        fetch(`/api/odoo/projects/${projectId}/branches?enrich=1`, {
          cache: "no-store",
        })
          .then((rr) => rr.json().catch(() => ({})))
          .then((dd) => {
            if (!dd?.ok || !Array.isArray(dd?.branches)) return;
            setBranches(dd.branches);
          })
          .catch(() => {
            // ignore enrich errors
          });
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setBranches([]);
        setError(e?.message || "Error cargando ramas");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [projectId]);

  // Listen for commits button
  useEffect(() => {
    const handler = (ev: any) => {
      const detail = ev?.detail || {};
      const branchId = Number(detail.branchId);
      if (!Number.isFinite(branchId)) return;
      const branchName = String(detail.branchName || "").trim() || `#${branchId}`;
      setCommitsBranch({ id: branchId, name: branchName });
      setCommitsOpen(true);
      loadBranchCommits(branchId);
    };
    window.addEventListener("lgd:branch:commits", handler as any);
    return () => window.removeEventListener("lgd:branch:commits", handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for logs button
  useEffect(() => {
    const handler = (ev: any) => {
      const detail = ev?.detail || {};
      const branchId = Number(detail.branchId);
      if (!Number.isFinite(branchId)) return;
      const branchName = String(detail.branchName || "").trim() || `#${branchId}`;
      setLogsBranch({ id: branchId, name: branchName });
      setLogsOpen(true);
      loadBranchLogs(branchId);
    };
    window.addEventListener("lgd:branch:logs", handler as any);
    return () => window.removeEventListener("lgd:branch:logs", handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh logs while the modal is open
  useEffect(() => {
    if (!logsOpen) return;
    const id = logsBranch?.id;
    if (!id) return;
    if (!logsAuto) return;

    // Refresh every 5s (silent: no spinner, no clearing)
    const t = window.setInterval(() => {
      loadBranchLogs(id, { silent: true });
    }, 5000);

    return () => window.clearInterval(t);
  }, [logsOpen, logsBranch?.id, logsAuto]);

  // ✅ cargar defaults cuando se abre el modal o cambia el tipo
  useEffect(() => {
    if (!projectId) return;
    if (!showCreate) return;

    const controller = new AbortController();

    setDefaultsLoading(true);
    setError(null);
    setBaseVersionName(null);
    setReleaseOptions([]);
    setSelectedReleaseId(null);

    const url =
      `/api/odoo/projects/${projectId}/branches/create-defaults` +
      `?deployType=${encodeURIComponent(newType)}` +
      `&t=${Date.now()}`;

    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as DefaultsResp;
        if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);
        return d;
      })
      .then((d) => {
        const baseName = d.defaults?.base_version?.name;
        setBaseVersionName(baseName ? String(baseName) : null);

        const releases = d.defaults?.releases || [];
        setReleaseOptions(releases.map((x) => ({ value: String(x.id), label: x.name })));

        const defId = d.defaults?.release_default?.id;
        if (defId !== undefined && defId !== null && defId !== false) {
          setSelectedReleaseId(String(defId));
        } else {
          setSelectedReleaseId(null);
        }
      })
      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Error cargando defaults");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDefaultsLoading(false);
      });

    return () => controller.abort();
  }, [projectId, showCreate, newType]);

  async function _createProductionAutoConfirmed() {
    if (!projectId) return;

    setCreatingProd(true);
    setError(null);

    try {
      const r = await fetch(`/api/odoo/branches/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          repository_id: projectId,
          type: "production",
        }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);

      reload();
    } catch (e: any) {
      setError(e?.message || "Error creando production");
    } finally {
      setCreatingProd(false);
    }
  }

  async function createProductionAuto() {
    if (!projectId) return;
    openConfirm("¿Crear rama de producción para este proyecto?", _createProductionAutoConfirmed);
  }

  async function createBranch(skipConfirm = false) {
    if (!projectId) return;

    const name = newName.trim();
    const v = validateBranchName(name);
    if (v) {
      setError(v);
      return;
    }

    if (newType === "production_deploy" && !skipConfirm) {
      openConfirm("¿Seguro? Esto creará una rama de producción.", () => createBranch(true));
      return;
    }

    if (releaseOptions.length > 0 && !selectedReleaseId) {
      setError("Elige un release");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const r = await fetch(`/api/odoo/projects/${projectId}/branches/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name,
          type_deploy: newType,
          base_version_tag_id: selectedReleaseId ? parseInt(selectedReleaseId, 10) : null,
        }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);

      resetCreateState();
      reload();
    } catch (e: any) {
      setError(e?.message || "Error creando rama");
    } finally {
      setCreating(false);
    }
  }

  async function runAction(branchId: number, action: ActionKind, skipConfirm = false) {
    if (action === "expire" && !skipConfirm) {
      openConfirm("¿Seguro que quieres expirar esta rama?", () => runAction(branchId, action, true));
      return;
    }

    setBusy((p) => ({ ...p, [branchId]: action }));
    setError(null);

    try {
      const r = await fetch(`/api/odoo/branches/${branchId}/${action}`, {
        method: "POST",
        cache: "no-store",
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);

      // The backend action can be async (stop/start may take a bit).
      // Refresh immediately, then keep refreshing for a short period so the UI updates.
      reload();
      if (action === "start" || action === "stop") {
        const startedAt = Date.now();
        const t = window.setInterval(() => {
          // stop after ~30s
          if (Date.now() - startedAt > 30000) {
            window.clearInterval(t);
            return;
          }
          reload();
        }, 2000);
      }
    } catch (e: any) {
      setError(e?.message || "Error ejecutando acción");
    } finally {
      setBusy((p) => {
        const n = { ...p };
        delete n[branchId]; // ✅ no dejes null
        return n;
      });
    }
  }

  // Agrupamiento por entorno
  const groupedBranches = {
    production: branches.filter((b) => b.type_deploy === "production_deploy"),
    staging: branches.filter((b) => b.type_deploy === "staging_deploy"),
    testing: branches.filter((b) => b.type_deploy === "testing_deploy"),
    local: branches.filter((b) => b.type_deploy === "local_deploy"),
    other: branches.filter((b) => !["production_deploy", "staging_deploy", "testing_deploy", "local_deploy"].includes(b.type_deploy || "")),
  };

  const renderBranchGroup = (title: string, items: Branch[], colorClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8 last:mb-0">
        <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${colorClass} flex items-center gap-2`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
          {title}
        </div>
        <div className="space-y-3">
          {items.map((b) => renderBranchCard(b))}
        </div>
      </div>
    );
  };

  const renderBranchCard = (b: Branch) => {
    const isRunning = b.container_status === "running";
    const rawUrl = String(b.server_url_nginx || "").trim();
    // Force http always (SSL/protocol switch will be manual later)
    const appUrl = rawUrl ? `http://${rawUrl.replace(/^https?:\/\//i, "")}` : "";
    // Local branches should not have start/stop/kill buttons.
    // Some legacy data uses type_deploy=="local" instead of "local_deploy".
    const isLocal = b.type_deploy === "local_deploy" || b.type_deploy === "local";
    const statusColor = isRunning ? "text-emerald-400" : "text-zinc-500";
    const statusBg = isRunning ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10";

    return (
      <div
        key={b.id}
        className={`group flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 ${statusBg} hover:bg-opacity-50 hover:border-white/20`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-white/90">{b.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/50 bg-white/5">#{b.id}</span>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${b.branch_status === 'created' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-white/10 text-white/40 bg-white/5'
              }`}>
              {b.branch_status || "UNKNOWN"}
            </span>
          </div>
          <div className="text-xs text-white/50 mt-1 flex flex-wrap items-center gap-2 font-mono">
            <span className={statusColor}>● {b.container_status || "STOPPED"}</span>
            {b.release_id ? (
              <span className="text-white/40">
                release: {Array.isArray(b.release_id) ? b.release_id[1] : String(b.release_id)}
              </span>
            ) : null}
            {b.current_docker_image ? (
              <span
                className="text-white/40 break-all"
                title="Click para copiar"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(b.current_docker_image));
                  } catch {
                    // ignore
                  }
                }}
                style={{ cursor: "copy" }}
              >
                image: {b.current_docker_image}
              </span>
            ) : null}
            {!b.current_docker_image && b.other_server_docker_image ? (
              <span
                className="text-white/40 break-all"
                title="Click para copiar"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(b.other_server_docker_image));
                  } catch {
                    // ignore
                  }
                }}
                style={{ cursor: "copy" }}
              >
                image: {b.other_server_docker_image}
              </span>
            ) : null}
            {b.user_id ? (
              <span className="text-white/30">
                user: {Array.isArray(b.user_id) ? b.user_id[1] : String(b.user_id)}
              </span>
            ) : null}
          </div>
        </div>

        {!isLocal ? (
          <div className="flex gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            {!isRunning ? (
              <Button
                size="xs"
                variant="default"
                className="bg-black/20 hover:bg-emerald-900/40 hover:text-emerald-200 border-white/10"
                loading={busy[b.id] === "start"}
                disabled={isBusy(b.id)}
                onClick={() => runAction(b.id, "start")}
              >
                ▶ Start
              </Button>
            ) : null}

            {isRunning ? (
              <Button
                size="xs"
                variant="default"
                className="bg-black/20 hover:bg-yellow-900/40 hover:text-yellow-200 border-white/10"
                loading={busy[b.id] === "stop"}
                disabled={isBusy(b.id)}
                onClick={() => runAction(b.id, "stop")}
              >
                ⏸ Stop
              </Button>
            ) : null}

            {appUrl ? (
              <Button
                size="xs"
                variant="default"
                className="bg-black/20 hover:bg-sky-900/40 hover:text-sky-100 border-white/10"
                component="a"
                href={appUrl}
                target="_blank"
                rel="noreferrer"
                title={appUrl}
              >
                🌐 Abrir
              </Button>
            ) : null}

            <Button
              size="xs"
              variant="default"
              className="bg-black/20 hover:bg-white/10 hover:text-white border-white/10"
              disabled={isBusy(b.id)}
              onClick={() => {
                // Show recent branch commits (Odoo branch.commits)
                window.dispatchEvent(
                  new CustomEvent("lgd:branch:commits", { detail: { branchId: b.id, branchName: b.name } })
                );
              }}
              title="Ver commits"
            >
              🧾 Commits
            </Button>

            <Button
              size="xs"
              variant="default"
              className="bg-black/20 hover:bg-white/10 hover:text-white border-white/10"
              disabled={isBusy(b.id)}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("lgd:branch:logs", { detail: { branchId: b.id, branchName: b.name } })
                );
              }}
              title="Ver logs del stack (satélite)"
            >
              📜 Logs
            </Button>

            <Button
              size="xs"
              variant="default"
              className="bg-black/20 hover:bg-red-900/40 hover:text-red-200 border-white/10"
              loading={busy[b.id] === "expire"}
              disabled={isBusy(b.id)}
              onClick={() => runAction(b.id, "expire")}
            >
              🗑 Kill
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  if (!projectId) {
    return (
      <div className="animate-in fade-in flex items-center justify-center h-full text-sm text-white/30 font-mono border border-dashed border-white/10 rounded-2xl bg-white/5 min-h-[300px]">
        Select a project to view environments…
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300 rounded-2xl border border-white/10 bg-[#0c0c0e] p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Environments</h3>
          <p className="text-xs text-white/40 font-mono mt-1">Deployments & Container Orchestration</p>
        </div>

        <div className="flex items-center gap-2">
          {groupedBranches.production.length === 0 && (
            <button
              className="flex items-center gap-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 text-xs font-mono transition-colors disabled:opacity-60"
              disabled={creatingProd}
              onClick={createProductionAuto}
            >
              {creatingProd ? "..." : "⚠"} Create prod
            </button>
          )}

          <button
            className="flex items-center gap-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 text-xs font-mono transition-colors"
            onClick={() => {
              setError(null);
              setShowCreate(true);
            }}
          >
            <span>＋</span> New branch
          </button>
        </div>
      </div>

      {error && (
        <Alert
          mb="xl"
          color="red"
          title="System Alert"
          variant="light"
          withCloseButton
          className="bg-red-500/10 border border-red-500/20 text-red-200"
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/50">
          <Loader size="sm" color="blue" />
          <div className="text-xs font-mono animate-pulse">Syncing…</div>
        </div>
      )}

      {!loading && !error && branches.length === 0 && (
        <div className="py-12 text-center text-white/30 text-sm font-mono border border-white/5 rounded-xl bg-white/5">
          No active deployments.
        </div>
      )}

      {!loading && (
        <div>
          {renderBranchGroup("Production", groupedBranches.production, "text-rose-400")}
          {renderBranchGroup("Staging", groupedBranches.staging, "text-amber-400")}
          {renderBranchGroup("Testing", groupedBranches.testing, "text-cyan-400")}
          {renderBranchGroup("Local dev", groupedBranches.local, "text-blue-400")}
          {renderBranchGroup("Others", groupedBranches.other, "text-zinc-400")}
        </div>
      )}

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={<span className="font-mono text-sm uppercase tracking-widest text-white/70">Confirm</span>}
        centered
        className="dark-modal"
        styles={{
          content: { backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)' },
          header: { backgroundColor: '#09090b' },
          body: { backgroundColor: '#09090b' }
        }}
      >
        <div className="text-sm text-white/80">{confirmMsg}</div>
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            className="bg-transparent border-white/10 text-white/60 hover:text-white"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={async () => {
              setConfirmOpen(false);
              try {
                await Promise.resolve(confirmAction?.());
              } catch (e: any) {
                setError(e?.message || "Error");
              }
            }}
          >
            Confirm
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={commitsOpen}
        onClose={() => setCommitsOpen(false)}
        title={
          <span className="font-mono text-sm uppercase tracking-widest text-white/70">
            Commits{commitsBranch ? ` · ${commitsBranch.name}` : ""}
          </span>
        }
        centered
        className="dark-modal"
        styles={{
          content: { backgroundColor: "#09090b", border: "1px solid rgba(255,255,255,0.1)" },
          header: { backgroundColor: "#09090b" },
          body: { backgroundColor: "#09090b" },
        }}
      >
        {commitsErr ? (
          <div className="text-sm text-red-200">{commitsErr}</div>
        ) : commitsLoading ? (
          <div className="text-sm text-white/60">Cargando commits...</div>
        ) : commitsRows.length === 0 ? (
          <div className="text-sm text-white/60">(sin commits)</div>
        ) : (
          <div className="space-y-2">
            {commitsRows.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-xs font-mono text-white/70 break-all">{c.commit_id || "-"}</div>
                {c.commit_message ? (
                  <div className="text-sm text-white/80 whitespace-pre-wrap mt-1">
                    {String(c.commit_message).slice(0, 220)}
                  </div>
                ) : null}
                <div className="text-[11px] text-white/40 mt-1">
                  {c.commit_datetime || "-"}
                  {c.commit_pusher ? ` · ${c.commit_pusher}` : c.commit_user ? ` · ${c.commit_user}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        opened={logsOpen}
        onClose={() => setLogsOpen(false)}
        title={
          <span className="font-mono text-sm uppercase tracking-widest text-white/70">
            Logs{logsBranch ? ` · ${logsBranch.name}` : ""}
          </span>
        }
        centered
        className="dark-modal"
        // Wider than xl; keeps some margin on large screens
        size="90%"
        styles={{
          content: { backgroundColor: "#09090b", border: "1px solid rgba(255,255,255,0.1)" },
          header: { backgroundColor: "#09090b" },
          body: { backgroundColor: "#09090b" },
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[11px] font-mono text-white/40">
            {logsLoading ? "Cargando…" : logsErr ? "Error" : logsAuto ? "Auto: ON (5s)" : "Auto: OFF"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="default"
              className="bg-black/20 hover:bg-white/10 hover:text-white border-white/10"
              onClick={() => setLogsAuto((v) => !v)}
            >
              {logsAuto ? "⏸ Auto" : "▶ Auto"}
            </Button>
            <Button
              size="xs"
              variant="default"
              className="bg-black/20 hover:bg-white/10 hover:text-white border-white/10"
              onClick={() => {
                const id = logsBranch?.id;
                if (id) loadBranchLogs(id);
              }}
            >
              ↻ Refresh
            </Button>
          </div>
        </div>

        {logsErr ? (
          <div className="text-sm text-red-200">{logsErr}</div>
        ) : logsLoading ? (
          <div className="text-sm text-white/60">Cargando logs...</div>
        ) : !logsText ? (
          <div className="text-sm text-white/60">(sin logs)</div>
        ) : (
          <pre className="text-[11px] leading-5 text-white/80 whitespace-pre-wrap break-words max-h-[70vh] overflow-auto rounded-lg border border-white/10 bg-black/30 p-3">
            {logsText}
          </pre>
        )}
      </Modal>

      <Modal
        opened={showCreate}
        onClose={() => {
          if (creating) return;
          setShowCreate(false);
        }}
        title={<span className="font-mono text-sm uppercase tracking-widest text-white/70">Init New Branch</span>}
        centered
        className="dark-modal"
        styles={{
          content: { backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)' },
          header: { backgroundColor: '#09090b' },
          body: { backgroundColor: '#09090b' }
        }}
      >
        <Stack gap="md">
          <TextInput
            data-autofocus
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            label={<span className="text-xs uppercase text-white/50 font-bold">Branch Name</span>}
            placeholder="feat-new-module"
            error={newName ? validateBranchName(newName) : null}
            disabled={creating}
            classNames={{
              input: "bg-white/5 border-white/10 text-white focus:border-blue-500/50"
            }}
          />

          <Select
            label={<span className="text-xs uppercase text-white/50 font-bold">Environment Type</span>}
            value={newType}
            onChange={(v) => {
              const t = (v as DeployType) || "staging_deploy";
              setNewType(t);
              setSelectedReleaseId(null);
              setError(null);
            }}
            data={[
              { value: "production_deploy", label: "🔴 Production" },
              { value: "staging_deploy", label: "🟡 Staging" },
              { value: "testing_deploy", label: "🔵 Testing" },
              { value: "local_deploy", label: "⚪ Local" },
            ]}
            disabled={creating}
            classNames={{
              input: "bg-white/5 border-white/10 text-white"
            }}
          />

          {defaultsLoading ? (
            <Group gap="sm" className="py-2">
              <Loader size="xs" color="blue" />
              <div className="text-xs font-mono text-white/50">Fetching base images...</div>
            </Group>
          ) : (
            <div className="bg-white/5 rounded-lg p-3 border border-white/5 space-y-3">
              <div className="text-xs text-white/50 flex justify-between">
                <span>Base Architecture:</span>
                <b className="text-white font-mono">{baseVersionName || "N/A"}</b>
              </div>

              <Select
                label={<span className="text-xs uppercase text-white/50 font-bold">Release Tag</span>}
                placeholder={releaseOptions.length ? "Select release tag" : "No stable releases found"}
                value={selectedReleaseId}
                onChange={setSelectedReleaseId}
                data={releaseOptions}
                disabled={creating || releaseOptions.length === 0}
                searchable
                nothingFoundMessage="No releases"
                classNames={{
                  input: "bg-black/20 border-white/10 text-white placeholder-white/20"
                }}
              />
            </div>
          )}

          <div className="text-[10px] text-white/30 font-mono bg-blue-900/10 p-2 rounded border border-blue-500/10">
            RULES: alphanumeric-only • no-spaces • star-wars-references-encouraged
          </div>

          <Group justify="flex-end" mt="xs">
            <Button
              variant="default"
              className="bg-transparent border-white/10 text-white/60 hover:text-white"
              onClick={() => {
                if (creating) return;
                setError(null);
                resetCreateState();
              }}
              disabled={creating}
            >
              Cancel
            </Button>

            <Button onClick={() => createBranch()} loading={creating} color="blue">
              Initialize
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
