import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const version = String(url.searchParams.get("version") || "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

    if (!version) {
      return NextResponse.json({ ok: false, error: "Falta version" }, { status: 400 });
    }

    const commits = await odooSearchRead(
      "github.commit",
      [["version", "=", version]],
      [
        "id",
        "commit_hash",
        "commit_hash_short",
        "commit_date",
        "commit_title",
        "commit_message",
      ],
      limit,
      0,
      "commit_date desc, id desc"
    );

    return NextResponse.json({ ok: true, commits: commits || [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
