import { odooCall } from "@/lib/odoo";

export type SatConfig = {
  stack: string;
  baseUrl: string;
  token: string;
  resourceId: number;
};

function cleanBaseUrl(url: string) {
  let u = String(url || "").trim().replace(/\/+$/, "");
  if (!u) return u;
  if (!/^https?:\/\//i.test(u)) {
    // Most of our satellites run behind https; default to https.
    u = `https://${u}`;
  }
  return u;
}

export async function getSatConfigFromBranch(branchId: number): Promise<SatConfig> {
  // server.branches(container_id -> container.deploy)
  const branches = await odooCall<any[]>("server.branches", "read", [[branchId], ["container_id"]]);
  const b = branches?.[0];
  const containerId = Array.isArray(b?.container_id) ? b.container_id[0] : null;
  if (!containerId) throw new Error("Branch has no container_id");

  // container.deploy(stack + resource_deploy_id)
  // Different DBs use different fields for the compose-stack name.
  // Prefer pipeline_name (commonly matches compose-stacks/<stack>/compose.yaml), fallback to database.
  const containers = await odooCall<any[]>(
    "container.deploy",
    "read",
    [[containerId], ["pipeline_name", "database", "resource_deploy_id"]]
  );
  const c = containers?.[0];
  const stack = String(c?.pipeline_name || c?.database || "").trim();
  if (!stack) throw new Error("container.deploy.pipeline_name/database missing");
  const resourceId = Array.isArray(c?.resource_deploy_id) ? c.resource_deploy_id[0] : null;
  if (!resourceId) throw new Error("container.deploy.resource_deploy_id missing");

  // server.resource(token_server + url_webhook_alternative)
  const resources = await odooCall<any[]>(
    "server.resource",
    "read",
    [[resourceId], ["token_server", "url_webhook_alternative"]]
  );
  const r = resources?.[0];
  const token = String(r?.token_server || "").trim();
  const baseUrl = cleanBaseUrl(String(r?.url_webhook_alternative || ""));
  if (!baseUrl) throw new Error("server.resource.url_webhook_alternative missing");
  if (!token) throw new Error("server.resource.token_server missing");

  return { stack, baseUrl, token, resourceId };
}

export async function satFetchJson(config: SatConfig, path: string, body: any) {
  const url = config.baseUrl + path;
  let r: Response;
  try {
    r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
  } catch (e: any) {
    throw new Error(`satellite fetch failed url=${url} err=${e?.message || String(e)}`);
  }

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.detail?.error || j?.detail || j?.error || `HTTP ${r.status}`;
    throw new Error(`satellite HTTP error url=${url} :: ` + (typeof msg === "string" ? msg : JSON.stringify(msg)));
  }
  return j;
}
