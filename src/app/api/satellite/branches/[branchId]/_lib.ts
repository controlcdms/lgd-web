import { odooCall } from "@/lib/odoo";

export type SatConfig = {
  stack: string;
  baseUrl: string;
  token: string;
};

function cleanBaseUrl(url: string) {
  return String(url || "").trim().replace(/\/+$/, "");
}

export async function getSatConfigFromBranch(branchId: number): Promise<SatConfig> {
  // server.branches(container_id -> container.deploy)
  const branches = await odooCall<any[]>("server.branches", "read", [[branchId], ["container_id"]]);
  const b = branches?.[0];
  const containerId = Array.isArray(b?.container_id) ? b.container_id[0] : null;
  if (!containerId) throw new Error("Branch has no container_id");

  // container.deploy(name + resource_deploy_id)
  const containers = await odooCall<any[]>("container.deploy", "read", [[containerId], ["name", "resource_deploy_id"]]);
  const c = containers?.[0];
  const stack = String(c?.name || "").trim();
  if (!stack) throw new Error("container.deploy.name missing");
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

  return { stack, baseUrl, token };
}

export async function satFetchJson(config: SatConfig, path: string, body: any) {
  const url = config.baseUrl + path;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.detail?.error || j?.detail || j?.error || `HTTP ${r.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return j;
}
