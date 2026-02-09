import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ containerId: string }> }
) {
  const { containerId } = await ctx.params;
  const id = Number(containerId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid container id" }, { status: 400 });
  }

  const base = (process.env.ODOO_BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    return NextResponse.json(
      { ok: false, error: "ODOO_BASE_URL not configured" },
      { status: 500 }
    );
  }

  const url = `${base}/web#id=${id}&model=container.deploy&view_type=form`;
  return NextResponse.redirect(url);
}
