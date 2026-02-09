import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const templateId = Number(id);

    if (!Number.isFinite(templateId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const releases = await odooSearchRead(
      "doodba.tag",
      [["doodba_template", "=", templateId]],
      ["id", "name", "ref", "create_date", "state", "sequence_number"],
      200,
      0,
      "create_date desc"
    );

    const res = NextResponse.json({ ok: true, releases: releases || [] });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
