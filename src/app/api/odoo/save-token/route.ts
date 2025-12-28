import { NextResponse } from "next/server";
import { odooCall, odooSearchRead } from "@/lib/odoo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // ✅ 1) Intenta identidad explícita (SSR)
    const githubIdFromHeader = req.headers.get("x-github-id");

    // ✅ 2) Si no vino header, cae a sesión normal (client-side)
    let githubId: string | null = githubIdFromHeader;

    if (!githubId) {
      const session = await getServerSession(authOptions);
      githubId = (session as any)?.user?.githubId ?? (session as any)?.githubId ?? null;
      if (!githubId) {
        return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
      }
    }

    const usersByUid = await odooSearchRead(
      "res.users",
      [["oauth_uid", "=", String(githubId)]],
      ["id", "login", "oauth_uid"],
      5
    );

    const odooUserId = usersByUid?.[0]?.id ?? null;
    if (!odooUserId) {
      return NextResponse.json(
        { ok: false, error: "Usuario Odoo no encontrado por oauth_uid", githubId, usersByUid },
        { status: 404 }
      );
    }

    const reposCountAll = await odooCall<number>("server.repos", "search_count", [[]]);

    const sample = await odooSearchRead(
      "server.repos",
      [],
      ["id", "repo_name", "user_id", "owner_id", "login_user"],
      10
    );

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

    return NextResponse.json({
      ok: true,
      debug: {
        githubId,
        odooUserId,
        reposCountAll,
        sample_len: sample.length,
      },
      projects,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
