import { NextResponse } from "next/server";
import { odooExecute } from "@/lib/odoo";
import { ensureBranchAccessAsUser } from "@/app/api/odoo/_authz";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ branchId: string }> }
) {
  try {

    const { branchId } = await ctx.params;
    const id = parseInt(branchId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid branchId" }, { status: 400 });
    }

    // AuthZ: user must have access to this branch
    const allowed = await ensureBranchAccessAsUser(req, id);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { restore_password?: unknown };
    const restore_password_raw = body?.restore_password;
    const restore_password = restore_password_raw === undefined || restore_password_raw === null
      ? false
      : String(restore_password_raw).trim();

    // server.branches.action_restore_from_production(restore_password=False) triggers token-based restore
    const r = await odooExecute("server.branches", "action_restore_from_production", [id], restore_password);
    return NextResponse.json({ ok: true, result: r ?? true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Restore failed" },
      { status: 500 }
    );
  }
}
