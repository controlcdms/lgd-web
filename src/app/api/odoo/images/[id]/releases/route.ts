import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const t0 = Date.now();
  try {
    const { id } = await ctx.params;
    const templateId = Number(id);

    if (!Number.isFinite(templateId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

    const tOdoo0 = Date.now();
    const releases = await odooSearchRead(
      "doodba.tag",
      [["doodba_template", "=", templateId]],
      ["id", "name", "ref", "create_date", "state", "sequence_number"],
      limit,
      offset,
      "id desc"
    );
    const tOdooMs = Date.now() - tOdoo0;

    const res = NextResponse.json({ ok: true, releases: releases || [], limit, offset });
    res.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    const totalMs = Date.now() - t0;
    res.headers.set("Server-Timing", `odoo;dur=${tOdooMs}, total;dur=${totalMs}`);
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
