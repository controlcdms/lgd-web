import { NextResponse } from "next/server";
import { odooCallAsUser, odooSearchReadAsUser } from "@/lib/odoo";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

    const [tpl] = await odooSearchReadAsUser(
      rpcAuth.login,
      rpcAuth.apiKey,
      "doodba.template",
      [["id", "=", templateId]],
      ["id", "dependency_pip_ids", "dependencia_apt_ids"],
      1
    );
    if (!tpl) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });

    const pipCatalog = await odooSearchReadAsUser(rpcAuth.login, rpcAuth.apiKey, "doodba.dependency.pip", [], ["id", "name"], 500, 0, "name asc");
    const aptCatalog = await odooSearchReadAsUser(rpcAuth.login, rpcAuth.apiKey, "doodba.dependency.apt", [], ["id", "name"], 500, 0, "name asc");

    return NextResponse.json({
      ok: true,
      selected: {
        pip_ids: (tpl as any).dependency_pip_ids || [],
        apt_ids: (tpl as any).dependencia_apt_ids || [],
      },
      catalog: { pip: pipCatalog, apt: aptCatalog },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

    const body = await req.json();
    const pip_ids = Array.isArray((body as any)?.pip_ids) ? (body as any).pip_ids.map(Number).filter(Number.isFinite) : [];
    const apt_ids = Array.isArray((body as any)?.apt_ids) ? (body as any).apt_ids.map(Number).filter(Number.isFinite) : [];

    await odooCallAsUser<boolean>(rpcAuth.login, rpcAuth.apiKey, "doodba.template", "write", [
      [templateId],
      { dependency_pip_ids: [[6, 0, pip_ids]], dependencia_apt_ids: [[6, 0, apt_ids]] },
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
