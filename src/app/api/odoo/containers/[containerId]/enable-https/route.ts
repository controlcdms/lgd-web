import { NextResponse } from "next/server";
import { odooCallAsUser, odooSearchReadAsUser } from "@/lib/odoo";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function POST(req: Request, ctx: { params: Promise<{ containerId: string }> }) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const { containerId } = await ctx.params;
    const id = parseInt(containerId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "Invalid container id" }, { status: 400 });
    }

    const rows = await odooSearchReadAsUser(
      rpcAuth.uid,
      rpcAuth.apiKey,
      "container.deploy",
      [["id", "=", id]],
      ["id", "user_id", "pipeline_name"],
      1
    );

    const container = rows?.[0] as any;
    if (!container) {
      return NextResponse.json({ ok: false, error: "Container not found" }, { status: 404 });
    }

    const ownerId = Array.isArray(container?.user_id) ? Number(container.user_id[0]) : 0;
    if (ownerId && ownerId !== rpcAuth.uid) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    await odooCallAsUser(rpcAuth.uid, rpcAuth.apiKey, "container.deploy", "action_enable_https_domain", [[id]]);

    return NextResponse.json({ ok: true, message: "HTTPS activado correctamente" });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || error?.data?.message || "Error activando HTTPS" },
      { status: 500 }
    );
  }
}
