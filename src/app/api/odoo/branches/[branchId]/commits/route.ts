import { NextResponse } from "next/server";
import { odooSearchReadAsUser } from "@/lib/odoo";
import { ensureBranchAccessAsUser, getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function GET(req: Request, ctx: { params: Promise<{ branchId: string }> }) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const { branchId } = await ctx.params;
    const id = Number(branchId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: "Invalid branch id" }, { status: 400 });
    }

    const branch = await ensureBranchAccessAsUser(req, id);
    if (!branch) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));

    const commits = await odooSearchReadAsUser(
      rpcAuth.login,
      rpcAuth.apiKey,
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
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
