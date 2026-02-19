import { NextResponse } from "next/server";
import { odooCall, odooSearchRead } from "@/lib/odoo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    const url = new URL(req.url);

    // ✅ 1) por query (SSR estable)
    const githubIdFromQuery = url.searchParams.get("githubId");

    // ✅ 2) por header (si lo quieres usar igual)
    const githubIdFromHeader = req.headers.get("x-github-id");

    let githubId: string | null = githubIdFromQuery || githubIdFromHeader;

    // ✅ 3) fallback a sesión (client-side normal)
    if (!githubId) {
      const session = await getServerSession(authOptions);
      githubId =
        (session as any)?.user?.githubId ??
        (session as any)?.githubId ??
        null;

      if (!githubId) {
        return NextResponse.json(
          {
            ok: false,
            error: "No githubId",
            debug: {
              githubIdFromQuery,
              githubIdFromHeader,
            },
          },
          { status: 401 }
        );
      }
    }

    const tUsers0 = Date.now();
    const usersByUid = await odooSearchRead(
      "res.users",
      [["oauth_uid", "=", String(githubId)]],
      ["id", "login", "oauth_uid"],
      1
    );
    const tUsersMs = Date.now() - tUsers0;

    const odooUserId = usersByUid?.[0]?.id ?? null;
    if (!odooUserId) {
      return NextResponse.json(
        { ok: false, error: "Usuario Odoo no encontrado", githubId },
        { status: 404 }
      );
    }

    const tRepos0 = Date.now();
    const projects = await odooSearchRead(
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

    // NOTE: keep this endpoint FAST.
    // Any expensive enrichment (production branch/container/release) must be done in a separate endpoint.

    const res = NextResponse.json({ ok: true, githubId, odooUserId, projects });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");

    const totalMs = Date.now() - t0;
    // Server-Timing for quick perf inspection in browser DevTools
    res.headers.set(
      "Server-Timing",
      `odoo_users;dur=${tUsersMs}, odoo_repos;dur=${tReposMs}, total;dur=${totalMs}`
    );
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
