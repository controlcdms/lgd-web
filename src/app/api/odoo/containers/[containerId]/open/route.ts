import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

function toBaseUrl(urlWebhookAlternative: string) {
  const s = String(urlWebhookAlternative || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s.replace(/\/$/, "");
  return `https://${s}`.replace(/\/$/, "");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ containerId: string }> }
) {
  const { containerId } = await ctx.params;
  const id = Number(containerId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid container id" }, { status: 400 });
  }

  // Resolve the Odoo base url from the remote server (resource_deploy_id.url_webhook_alternative)
  // so we don't depend on the Next deployment env.
  const containers = await odooSearchRead(
    "container.deploy",
    [["id", "=", id]],
    ["id", "resource_deploy_id"],
    1
  );
  const c = containers?.[0] || null;
  const resourceId = Array.isArray(c?.resource_deploy_id) ? c.resource_deploy_id[0] : null;
  if (!resourceId) {
    return NextResponse.json(
      { ok: false, error: "container has no resource_deploy_id" },
      { status: 404 }
    );
  }

  const resources = await odooSearchRead(
    "server.resource",
    [["id", "=", resourceId]],
    ["id", "url_webhook_alternative"],
    1
  );
  const r = resources?.[0] || null;
  const base = toBaseUrl(r?.url_webhook_alternative);
  if (!base) {
    return NextResponse.json(
      { ok: false, error: "resource missing url_webhook_alternative", resourceId },
      { status: 404 }
    );
  }

  const url = `${base}/web#id=${id}&model=container.deploy&view_type=form`;
  return NextResponse.redirect(url);
}
