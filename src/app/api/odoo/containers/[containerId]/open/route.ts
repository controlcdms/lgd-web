import { NextResponse } from "next/server";

function cleanBaseUrl(url: string) {
  const s = String(url || "").trim().replace(/\/+$/, "");
  return s;
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

  const base = cleanBaseUrl(process.env.ODOO_URL || "");
  if (!base) {
    return NextResponse.json({ ok: false, error: "Missing ODOO_URL env" }, { status: 500 });
  }

  // Open the container in the Odoo panel (form view)
  const url = `${base}/web#id=${id}&model=container.deploy&view_type=form`;
  return NextResponse.redirect(url);
}
