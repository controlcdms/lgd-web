import { NextResponse } from "next/server";
import { odooSearchReadAsUser } from "@/lib/odoo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

async function ensureProjectAccessAsUser(req: Request, projectId: number) {
  const rpcAuth = await getOdooRpcAuth(req);
  if (!rpcAuth) return null;

  const rows = await odooSearchReadAsUser(
    rpcAuth.uid,
    rpcAuth.apiKey,
    "server.repos",
    [["id", "=", projectId]],
    ["id"],
    1
  );
  return rows?.[0] || null;
}

export async function GET(
  req: Request,
  ctx: { params: { projectId?: string } } | { params: Promise<{ projectId?: string }> }
) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const enrich = url.searchParams.get("enrich") === "1";

  const session = await getServerSession(authOptions);
  const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
  if (!odooUserId) {
    return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
  }

  const rpcAuth = await getOdooRpcAuth(req);
  if (!rpcAuth) {
    return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
  }

  const rawParams = await (ctx as any).params;
  const rawId = rawParams?.projectId;

  const projectId = Number(rawId);
  if (!rawId || Number.isNaN(projectId)) {
    return NextResponse.json({ ok: false, error: "Invalid project id", rawId }, { status: 400 });
  }

  const hasAccess = await ensureProjectAccessAsUser(req, projectId);
  if (!hasAccess) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const tBranches0 = Date.now();
  const branches = await odooSearchReadAsUser(
    rpcAuth.uid,
    rpcAuth.apiKey,
    "server.branches",
    [["repository_id", "=", projectId], ["active", "=", true]],
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

  if (enrich) {
    const containerIds = (branches || [])
      .map((b: any) => (Array.isArray(b?.container_id) ? b.container_id[0] : null))
      .filter((x: any) => Number.isFinite(x));

    if (containerIds.length) {
      const tContainers0 = Date.now();
      const containers = await odooSearchReadAsUser(
        rpcAuth.uid,
        rpcAuth.apiKey,
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
