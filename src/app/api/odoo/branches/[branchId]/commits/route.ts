import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await ctx.params;
    const id = Number(branchId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: "Invalid branch id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));

    const commits = await odooSearchRead(
      "branch.commits",
      [["branch_id", "=", id]],
      ["id", "commit_id", "commit_message", "commit_datetime", "commit_user", "commit_pusher"],
      limit,
      0,
      "commit_datetime desc, id desc"
    );

    const res = NextResponse.json({ ok: true, commits: commits || [] });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
