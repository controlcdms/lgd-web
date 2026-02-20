import { NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";
import { ensureBranchAccess, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ branchId: string }> }
) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const { branchId } = await ctx.params;
    const id = parseInt(branchId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "Invalid branch id" }, { status: 400 });
    }

    const branch = await ensureBranchAccess(id, odooUserId);
    if (!branch) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    await odooCall("server.branches", "unlink", [[id]]);

    return NextResponse.json({ ok: true, message: "Rama expirada correctamente" });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || error?.data?.message || "Error al expirar la rama" },
      { status: 500 }
    );
  }
}
