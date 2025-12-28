import { NextResponse } from "next/server";
import { odooCall, odooSearchRead } from "@/lib/odoo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
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

    const usersByUid = await odooSearchRead(
      "res.users",
      [["oauth_uid", "=", String(githubId)]],
      ["id", "login", "oauth_uid"],
      1
    );

    const odooUserId = usersByUid?.[0]?.id ?? null;
    if (!odooUserId) {
      return NextResponse.json(
        { ok: false, error: "Usuario Odoo no encontrado", githubId },
        { status: 404 }
      );
    }

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

    return NextResponse.json({ ok: true, githubId, odooUserId, projects });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
