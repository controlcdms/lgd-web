import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

// POST { repoIds: number[] }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const repoIds = Array.isArray(body?.repoIds) ? body.repoIds.map(Number).filter(Number.isFinite) : [];

    if (!repoIds.length) {
      return NextResponse.json({ ok: true, summaryByRepoId: {} });
    }

    // Find production branch per repo
    const prodBranches = await odooSearchRead(
      "server.branches",
      [
        ["repository_id", "in", repoIds],
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

    const prodBranchByRepo: Record<string, any> = {};
    for (const b of prodBranches || []) {
      const rid = Array.isArray(b?.repository_id) ? b.repository_id[0] : b?.repository_id;
      if (!rid) continue;
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
        ["id", "current_docker_image", "other_server_docker_image", "doodba_release_id"],
        Math.min(200, prodContainerIds.length),
        0,
        "id desc"
      );
      for (const c of containers || []) containersById[String(c.id)] = c;
    }

    const summaryByRepoId: Record<string, any> = {};
    for (const rid of repoIds) {
      const b = prodBranchByRepo[String(rid)] || null;
      const cid = b && Array.isArray(b?.container_id) ? b.container_id[0] : null;
      const c = cid ? containersById[String(cid)] : null;

      summaryByRepoId[String(rid)] = {
        prod_branch: b
          ? {
              id: b.id,
              name: b.name,
              type_deploy: b.type_deploy,
              container_status: b.container_status,
            }
          : null,
        prod_release: c?.doodba_release_id || null,
        prod_image: c?.current_docker_image || c?.other_server_docker_image || null,
      };
    }

    const res = NextResponse.json({ ok: true, summaryByRepoId });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
