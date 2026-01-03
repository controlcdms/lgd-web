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

    fetch(`/api/odoo/projects/${projectId}/branches`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
        return d;
      })
      .then((d) => setBranches(d?.branches || []))
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

  async function createBranch() {
    if (!projectId) return;

    const name = newName.trim();
    const v = validateBranchName(name);
    if (v) {
      setError(v);
      return;
    }

    if (newType === "production_deploy") {
      const ok = confirm("¿Seguro? Esto creará una rama de PRODUCCIÓN.");
      if (!ok) return;
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

  async function runAction(branchId: number, action: ActionKind) {
    if (action === "expire") {
      const ok = confirm("¿Seguro que quieres expirar esta rama?");
      if (!ok) return;
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

      reload();
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

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Selecciona un proyecto para ver sus ramas.
      </div>
    );
  }

  return (
    
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        padding: 6,
        marginBottom: 8,
        background: "rgba(255,0,0,0.15)",
        border: "1px solid rgba(255,0,0,0.5)",
        color: "#ff6b6b",
        fontSize: 12,
      }}
    >
      DEBUG: ProjectDetails Ramas (render OK) · loading={String(loading)} ·
      showCreate={String(showCreate)}
    </div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Ramas</h3>

        <div className="flex items-center gap-2">
<Button
  size="xs"
  variant="outline"
  style={{ pointerEvents: "auto", zIndex: 9999 }}
  onClick={() => console.log("CLICK REAL")}
>
  ＋ Añadir rama
</Button>




          <Button size="xs" variant="outline" onClick={reload} disabled={loading}>
            ⟳ Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          mb="sm"
          color="red"
          title="Ojo"
          variant="light"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {loading && (
        <Group gap="sm">
          <Loader size="sm" />
          <div className="text-sm text-white/60">Cargando ramas…</div>
        </Group>
      )}

      {!loading && !error && branches.length === 0 && (
        <div className="text-sm text-white/60">Este proyecto no tiene ramas.</div>
      )}

      <div className="space-y-2">
        {branches.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-white/20 p-3 bg-white/5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-white/60">
                {(b.type_deploy || "-")} · {(b.branch_status || "-")} · {(b.container_status || "-")}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                size="xs"
                variant="outline"
                loading={busy[b.id] === "start"}
                disabled={isBusy(b.id)}
                onClick={() => runAction(b.id, "start")}
              >
                ▶ Iniciar
              </Button>

              <Button
                size="xs"
                variant="outline"
                loading={busy[b.id] === "stop"}
                disabled={isBusy(b.id)}
                onClick={() => runAction(b.id, "stop")}
              >
                ⏸ Detener
              </Button>

              <Button
                size="xs"
                color="red"
                variant="outline"
                loading={busy[b.id] === "expire"}
                disabled={isBusy(b.id)}
                onClick={() => runAction(b.id, "expire")}
              >
                🗑 Expirar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        opened={showCreate}
        onClose={() => {
          if (creating) return;
          setShowCreate(false);
        }}
        title="Crear rama"
        centered
      >
        <Stack gap="sm">
          <TextInput
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            label="Nombre"
            error={newName ? validateBranchName(newName) : null}
            disabled={creating}
          />

          <Select
            label="Tipo"
            value={newType}
            onChange={(v) => {
              const t = (v as DeployType) || "staging_deploy";
              setNewType(t);
              setSelectedReleaseId(null);
              setError(null);
            }}
            data={[
              { value: "staging_deploy", label: "staging" },
              { value: "testing_deploy", label: "testing" },
              { value: "local_deploy", label: "local" },
              { value: "production_deploy", label: "production" },
            ]}
            disabled={creating}
          />

          {defaultsLoading ? (
            <Group gap="sm">
              <Loader size="sm" />
              <div className="text-sm">Cargando versión y releases…</div>
            </Group>
          ) : (
            <>
              <div className="text-xs text-white/60">
                Versión (base): <b>{baseVersionName || "-"}</b>
              </div>

              <Select
                label="Release"
                placeholder={releaseOptions.length ? "Elige release" : "No hay releases publish"}
                value={selectedReleaseId}
                onChange={setSelectedReleaseId}
                data={releaseOptions}
                disabled={creating || releaseOptions.length === 0}
                searchable
                nothingFoundMessage="Nada"
              />
            </>
          )}

          <div className="text-xs text-white/60">
            Reglas: sin espacios / sin símbolos raros / no empieza con número.
          </div>

          <Group justify="flex-end" mt="xs">
            <Button
              variant="default"
              onClick={() => {
                if (creating) return;
                setError(null);
                resetCreateState();
              }}
              disabled={creating}
            >
              Cancelar
            </Button>

            <Button onClick={createBranch} loading={creating}>
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
