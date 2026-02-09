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

    // Enrich projects with production release + image (fast summary for grid).
    const projectIds = (projects || [])
      .map((p: any) => p?.id)
      .filter((x: any) => Number.isFinite(x));

    let prodBranchByRepo: Record<string, any> = {};
    if (projectIds.length) {
      const prodBranches = await odooSearchRead(
        "server.branches",
        [
          ["repository_id", "in", projectIds],
          ["active", "=", true],
          "|",
          ["type_deploy", "=", "production_deploy"],
          ["name", "=", "production"],
        ],
        ["id", "repository_id", "name", "type_deploy", "container_id", "container_status"],
        200,
        0,
        "id desc"
      );

      for (const b of prodBranches || []) {
        // repository_id is a many2one -> [id, name]
        const rid = Array.isArray(b?.repository_id) ? b.repository_id[0] : b?.repository_id;
        if (!rid) continue;
        // Keep first match (latest id desc)
        if (!prodBranchByRepo[String(rid)]) prodBranchByRepo[String(rid)] = b;
      }

      const prodContainerIds = Object.values(prodBranchByRepo)
        .map((b: any) => (Array.isArray(b?.container_id) ? b.container_id[0] : null))
        .filter((x: any) => Number.isFinite(x));

      let containersById: Record<string, any> = {};
      if (prodContainerIds.length) {
        const containers = await odooSearchRead(
          "container.deploy",
          [["id", "in", prodContainerIds]],
          [
            "id",
            "current_docker_image",
            "other_server_docker_image",
            "doodba_release_id",
          ],
          Math.min(200, prodContainerIds.length),
          0,
          "id desc"
        );
        for (const c of containers || []) {
          containersById[String(c.id)] = c;
        }

        // attach summary to projects
        for (const p of projects || []) {
          const rid = p?.id;
          const b = rid ? prodBranchByRepo[String(rid)] : null;
          const cid = b && Array.isArray(b?.container_id) ? b.container_id[0] : null;
          const c = cid ? containersById[String(cid)] : null;

          p.prod_branch = b ? { id: b.id, name: b.name, type_deploy: b.type_deploy, container_status: b.container_status } : null;
          p.prod_release = c?.doodba_release_id || null;
          p.prod_image = c?.current_docker_image || c?.other_server_docker_image || null;
        }
      }
    }

    const res = NextResponse.json({ ok: true, githubId, odooUserId, projects });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
