import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead, odooWrite } from "@/lib/odoo";

async function ensureAuth() {
  const session = await getServerSession(authOptions);
  return Number((session as any)?.user?.odooUserId || 0) || null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const odooUserId = await ensureAuth();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const [tpl] = await odooSearchRead("doodba.template", [["id", "=", templateId]], ["id", "dependency_pip_ids", "dependencia_apt_ids"], 1);
    if (!tpl) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });

    const pipCatalog = await odooSearchRead("doodba.dependency.pip", [], ["id", "name"], 500, 0, "name asc");
    const aptCatalog = await odooSearchRead("doodba.dependency.apt", [], ["id", "name"], 500, 0, "name asc");

    return NextResponse.json({
      ok: true,
      selected: {
        pip_ids: tpl.dependency_pip_ids || [],
        apt_ids: tpl.dependencia_apt_ids || [],
      },
      catalog: { pip: pipCatalog, apt: aptCatalog },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const odooUserId = await ensureAuth();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const pip_ids = Array.isArray(body?.pip_ids) ? body.pip_ids.map(Number).filter(Number.isFinite) : [];
    const apt_ids = Array.isArray(body?.apt_ids) ? body.apt_ids.map(Number).filter(Number.isFinite) : [];

    await odooWrite("doodba.template", [templateId], {
      dependency_pip_ids: [[6, 0, pip_ids]],
      dependencia_apt_ids: [[6, 0, apt_ids]],
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
