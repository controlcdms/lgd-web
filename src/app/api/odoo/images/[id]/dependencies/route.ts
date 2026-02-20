import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

function idFromParam(raw: any) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error("ID inválido");
  return n;
}

async function ensureAuth() {
  const session = await getServerSession(authOptions);
  return Number((session as any)?.user?.odooUserId || 0) || null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const odooUserId = await ensureAuth();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = idFromParam(id);

    const rows = await odooCallAsUser<any[]>(rpcAuth.login, rpcAuth.apiKey, "doodba.template", "read", [[templateId], ["dependency_pip_ids", "dependencia_apt_ids"]]);
    const row = rows?.[0] || {};
    const pipIds: number[] = Array.isArray((row as any).dependency_pip_ids) ? (row as any).dependency_pip_ids : [];
    const aptIds: number[] = Array.isArray((row as any).dependencia_apt_ids) ? (row as any).dependencia_apt_ids : [];

    const pip = pipIds.length ? await odooCallAsUser<any[]>(rpcAuth.login, rpcAuth.apiKey, "doodba.dependency.pip", "read", [pipIds, ["name"]]) : [];
    const apt = aptIds.length ? await odooCallAsUser<any[]>(rpcAuth.login, rpcAuth.apiKey, "doodba.dependency.apt", "read", [aptIds, ["name"]]) : [];

    return NextResponse.json({
      ok: true,
      pip: pip.map((x) => (x as any)?.name).filter(Boolean),
      apt: apt.map((x) => (x as any)?.name).filter(Boolean),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const odooUserId = await ensureAuth();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = idFromParam(id);
    const body = await req.json();

    const pipNames: string[] = Array.isArray((body as any)?.pip) ? (body as any).pip : [];
    const aptNames: string[] = Array.isArray((body as any)?.apt) ? (body as any).apt : [];

    const pipRows = pipNames.length
      ? await odooCallAsUser<any[]>(rpcAuth.login, rpcAuth.apiKey, "doodba.dependency.pip", "search_read", [
          [["name", "in", pipNames]],
          ["id", "name"],
        ], { limit: 500 })
      : [];

    const aptRows = aptNames.length
      ? await odooCallAsUser<any[]>(rpcAuth.login, rpcAuth.apiKey, "doodba.dependency.apt", "search_read", [
          [["name", "in", aptNames]],
          ["id", "name"],
        ], { limit: 500 })
      : [];

    const pipIds = pipRows.map((x) => (x as any).id);
    const aptIds = aptRows.map((x) => (x as any).id);

    const ok = await odooCallAsUser<boolean>(rpcAuth.login, rpcAuth.apiKey, "doodba.template", "write", [
      [templateId],
      { dependency_pip_ids: [[6, 0, pipIds]], dependencia_apt_ids: [[6, 0, aptIds]] },
    ]);

    return NextResponse.json({ ok: !!ok });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
