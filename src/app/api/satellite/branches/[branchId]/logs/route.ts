import { NextRequest, NextResponse } from "next/server";
import { getSatConfigFromBranch } from "../_lib";
import { odooLoginCookie } from "@/lib/odoo-login";

export async function POST(req: NextRequest, context: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await context.params;
  const id = Number(branchId);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "Invalid branchId" }, { status: 400 });

  let cfg: Awaited<ReturnType<typeof getSatConfigFromBranch>> | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const service = String(body?.service || "odoo");
    const tail = Number(body?.tail || 200);

    cfg = await getSatConfigFromBranch(id);

    // Ask the PANEL to proxy satellite logs using server.resource.token_server.
    // This avoids exposing/handling satellite bearer tokens in the Next UI.
    const cookie = await odooLoginCookie();
    // Some reverse proxies (e.g. Nginx Proxy Manager) can be misconfigured to
    // drop request bodies on certain paths. To make this robust, pass required
    // params also in the query string.
    const base = process.env.ODOO_URL_INTERNAL || process.env.ODOO_URL;
    const u = new URL(`${base}/api/satellite/stack/logs`);
    u.searchParams.set("resource_id", String(cfg.resourceId));
    u.searchParams.set("stack", cfg.stack);
    u.searchParams.set("service", service);
    u.searchParams.set("tail", String(tail));

    const r = await fetch(u.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      // Keep body too (works in direct deployments and avoids URL length issues).
      body: JSON.stringify({
        resource_id: cfg.resourceId,
        stack: cfg.stack,
        service,
        tail,
      }),
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.ok === false) {
      throw new Error(j?.error || j?.detail || `HTTP ${r.status}`);
    }

    return NextResponse.json({ ok: true, config: { stack: cfg.stack }, ...j });
  } catch (e: any) {
    const config = cfg ? { stack: cfg.stack, baseUrl: cfg.baseUrl } : undefined;
    return NextResponse.json({ ok: false, error: e?.message || String(e), config }, { status: 500 });
  }
}
