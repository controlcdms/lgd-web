import { NextResponse } from "next/server";
import { odooSearchReadAsUser } from "@/lib/odoo";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function GET(req: Request) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const url = new URL(req.url);
    const version = String(url.searchParams.get("version") || "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

    if (!version) {
      return NextResponse.json({ ok: false, error: "Falta version" }, { status: 400 });
    }

    const commits = await odooSearchReadAsUser(
      rpcAuth.login,
      rpcAuth.apiKey,
      "github.commit",
      [["version", "=", version]],
      ["id", "commit_hash", "commit_hash_short", "commit_date", "commit_title", "commit_message"],
      limit,
      0,
      "commit_date desc, id desc"
    );

    const res = NextResponse.json({ ok: true, commits: commits || [] });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
