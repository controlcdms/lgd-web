import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(
  req: Request,
  ctx: { params: { projectId?: string } } | { params: Promise<{ projectId?: string }> }
) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const enrich = url.searchParams.get("enrich") === "1";

  const rawParams = await (ctx as any).params; // soporta object o Promise
  const rawId = rawParams?.projectId;

  const projectId = Number(rawId);
  if (!rawId || Number.isNaN(projectId)) {
    return NextResponse.json({ ok: false, error: "Invalid project id", rawId }, { status: 400 });
  }

  const tBranches0 = Date.now();
  const branches = await odooSearchRead(
    "server.branches",
    [
      ["repository_id", "=", projectId],
      ["active", "=", true],
    ],
    [
      "id",
      "name",
      "type_deploy",
      "branch_status",
      "container_status",
      "server_url_nginx",
      "container_id",
      "user_id",
      "jenkins_url_html",
      "instructions_dev",
    ],
    200,
    0,
    "type_deploy, name"
  );
  const tBranchesMs = Date.now() - tBranches0;

  let tContainersMs = 0;
  let containersById: Record<string, any> = {};

  // Optional enrich with container.deploy info (release + image)
  if (enrich) {
    const containerIds = (branches || [])
      .map((b: any) => (Array.isArray(b?.container_id) ? b.container_id[0] : null))
      .filter((x: any) => Number.isFinite(x));

    if (containerIds.length) {
      const tContainers0 = Date.now();
      const containers = await odooSearchRead(
        "container.deploy",
        [["id", "in", containerIds]],
        ["id", "current_docker_image", "other_server_docker_image", "doodba_release_id"],
        Math.min(200, containerIds.length),
        0,
        "id desc"
      );
      for (const c of containers || []) containersById[String(c.id)] = c;
      tContainersMs = Date.now() - tContainers0;
    }
  }

  const enriched = (branches || []).map((b: any) => {
    if (!enrich) return b;
    const cid = Array.isArray(b?.container_id) ? b.container_id[0] : null;
    const c = cid ? containersById[String(cid)] : null;
    return {
      ...b,
      release_id: c?.doodba_release_id || null,
      current_docker_image: c?.current_docker_image || null,
      other_server_docker_image: c?.other_server_docker_image || null,
    };
  });

  const res = NextResponse.json({
    ok: true,
    branches: enriched,
    meta: {
      enrich,
      branchesCount: (branches || []).length,
      containersFound: Object.keys(containersById || {}).length,
    },
  });
  res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");

  const totalMs = Date.now() - t0;
  res.headers.set(
    "Server-Timing",
    `odoo_branches;dur=${tBranchesMs}, odoo_containers;dur=${tContainersMs}, total;dur=${totalMs}`
  );
  return res;
}
