import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

function idFromParam(raw: any) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error("ID inválido");
  return n;
}

async function ensureAuth() {
  const session = await getServerSession(authOptions);
  return Number((session as any)?.user?.odooUserId || 0) || null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const odooUserId = await ensureAuth();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = idFromParam(id);

    const rows = await odooCall<any[]>("doodba.template", "read", [[templateId], ["dependency_pip_ids", "dependencia_apt_ids"]]);

    const row = rows?.[0] || {};
    const pipIds: number[] = Array.isArray(row.dependency_pip_ids) ? row.dependency_pip_ids : [];
    const aptIds: number[] = Array.isArray(row.dependencia_apt_ids) ? row.dependencia_apt_ids : [];

    const pip = pipIds.length ? await odooCall<any[]>("doodba.dependency.pip", "read", [pipIds, ["name"]]) : [];
    const apt = aptIds.length ? await odooCall<any[]>("doodba.dependency.apt", "read", [aptIds, ["name"]]) : [];

    return NextResponse.json({
      ok: true,
      pip: pip.map((x) => x?.name).filter(Boolean),
      apt: apt.map((x) => x?.name).filter(Boolean),
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
    const templateId = idFromParam(id);
    const body = await req.json();

    const pipNames: string[] = Array.isArray(body?.pip) ? body.pip : [];
    const aptNames: string[] = Array.isArray(body?.apt) ? body.apt : [];

    const pipRows = pipNames.length
      ? await odooCall<any[]>("doodba.dependency.pip", "search_read", [
          [["name", "in", pipNames]],
          ["id", "name"],
        ], { limit: 500 })
      : [];

    const aptRows = aptNames.length
      ? await odooCall<any[]>("doodba.dependency.apt", "search_read", [
          [["name", "in", aptNames]],
          ["id", "name"],
        ], { limit: 500 })
      : [];

    const pipIds = pipRows.map((x) => x.id);
    const aptIds = aptRows.map((x) => x.id);

    const ok = await odooCall<boolean>("doodba.template", "write", [
      [templateId],
      {
        dependency_pip_ids: [[6, 0, pipIds]],
        dependencia_apt_ids: [[6, 0, aptIds]],
      },
    ]);

    return NextResponse.json({ ok: !!ok });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
