import { NextResponse } from "next/server";
import { odooSearchReadAsUser } from "@/lib/odoo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId ?? null;
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;

    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session", debug: { githubId } }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const tRepos0 = Date.now();
    const projects = await odooSearchReadAsUser(
      rpcAuth.uid,
      rpcAuth.apiKey,
      "server.repos",
      ["|", ["user_id", "=", odooUserId], ["owner_id", "=", odooUserId]],
      [
        "id",
        "repo_name",
        "project_states",
        "type_deploy_repository",
        "active",
        "base_version",
        "branch_version",
        "image_type_scope",
        "user_id",
        "login_user",
        "owner_id",
        "html_url",
        "ssh_url",
      ],
      200
    );
    const tReposMs = Date.now() - tRepos0;

    const res = NextResponse.json({ ok: true, githubId, odooUserId, projects });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");

    const totalMs = Date.now() - t0;
    res.headers.set("Server-Timing", `odoo_repos;dur=${tReposMs}, total;dur=${totalMs}`);
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
