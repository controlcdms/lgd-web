import { NextResponse } from "next/server";
import { odooSearchReadAsUser } from "@/lib/odoo";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

// POST { repoIds: number[] }
export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const repoIdsRaw = Array.isArray((body as any)?.repoIds) ? (body as any).repoIds : [];
    const repoIds = Array.from(new Set(repoIdsRaw.map(Number).filter(Number.isFinite)));

    if (!repoIds.length) return NextResponse.json({ ok: true, summaryByRepoId: {} });
    if (repoIds.length > 200) {
      return NextResponse.json({ ok: false, error: `Too many repoIds (${repoIds.length}). Max 200.` }, { status: 400 });
    }

    const tBranches0 = Date.now();
    const prodBranches = await odooSearchReadAsUser(
      rpcAuth.uid,
      rpcAuth.apiKey,
      "server.branches",
      [
        ["repository_id", "in", repoIds],
        ["active", "=", true],
        "|",
        ["type_deploy", "=", "production_deploy"],
        ["name", "=", "production"],
      ],
      ["id", "repository_id", "name", "type_deploy", "container_id", "container_status"],
      Math.min(200, repoIds.length * 2),
      0,
      "id desc"
    );
    const tBranchesMs = Date.now() - tBranches0;

    const prodBranchByRepo: Record<string, any> = {};
    for (const b of prodBranches || []) {
      const rid = Array.isArray((b as any)?.repository_id) ? (b as any).repository_id[0] : (b as any)?.repository_id;
      if (!rid) continue;
      if (!prodBranchByRepo[String(rid)]) prodBranchByRepo[String(rid)] = b;
    }

    const prodContainerIds = Object.values(prodBranchByRepo)
      .map((b: any) => (Array.isArray(b?.container_id) ? b.container_id[0] : null))
      .filter((x: any) => Number.isFinite(x));

    const tContainers0 = Date.now();
    const containersById: Record<string, any> = {};
    if (prodContainerIds.length) {
      const containers = await odooSearchReadAsUser(
        rpcAuth.uid,
        rpcAuth.apiKey,
        "container.deploy",
        [["id", "in", prodContainerIds]],
        ["id", "current_docker_image", "other_server_docker_image", "doodba_release_id"],
        Math.min(200, prodContainerIds.length),
        0,
        "id desc"
      );
      for (const c of containers || []) containersById[String((c as any).id)] = c;
    }
    const tContainersMs = Date.now() - tContainers0;

    const summaryByRepoId: Record<string, any> = {};
    for (const rid of repoIds) {
      const b = prodBranchByRepo[String(rid)] || null;
      const cid = b && Array.isArray((b as any)?.container_id) ? (b as any).container_id[0] : null;
      const c = cid ? containersById[String(cid)] : null;
      summaryByRepoId[String(rid)] = {
        prod_branch: b
          ? {
              id: (b as any).id,
              name: (b as any).name,
              type_deploy: (b as any).type_deploy,
              container_status: (b as any).container_status,
            }
          : null,
        prod_release: (c as any)?.doodba_release_id || null,
        prod_image: (c as any)?.current_docker_image || (c as any)?.other_server_docker_image || null,
      };
    }

    const res = NextResponse.json({ ok: true, summaryByRepoId });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    const totalMs = Date.now() - t0;
    res.headers.set("Server-Timing", `odoo_branches;dur=${tBranchesMs}, odoo_containers;dur=${tContainersMs}, total;dur=${totalMs}`);
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
