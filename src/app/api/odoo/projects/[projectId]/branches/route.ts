import { NextResponse } from "next/server";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(
  _req: Request,
  ctx: { params: { projectId?: string } } | { params: Promise<{ projectId?: string }> }
) {
  const rawParams = await (ctx as any).params; // soporta object o Promise
  const rawId = rawParams?.projectId;

  console.log("params:", rawParams, "rawId:", rawId);

  const projectId = Number(rawId);
  if (!rawId || Number.isNaN(projectId)) {
    return NextResponse.json({ ok: false, error: "Invalid project id", rawId }, { status: 400 });
  }

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
    ],
    200,
    0,
    "type_deploy, name"
  );

  // Enrich with container.deploy info (release + image), because server.branches doesn't expose it directly.
  const containerIds = (branches || [])
    .map((b: any) => (Array.isArray(b?.container_id) ? b.container_id[0] : null))
    .filter((x: any) => Number.isFinite(x));

  let containersById: Record<string, any> = {};
  if (containerIds.length) {
    const containers = await odooSearchRead(
      "container.deploy",
      [["id", "in", containerIds]],
      [
        "id",
        "current_docker_image",
        "other_server_docker_image",
        "doodba_release_id",
      ],
      Math.min(200, containerIds.length),
      0,
      "id desc"
    );
    for (const c of containers || []) {
      containersById[String(c.id)] = c;
    }
  }

  const enriched = (branches || []).map((b: any) => {
    const cid = Array.isArray(b?.container_id) ? b.container_id[0] : null;
    const c = cid ? containersById[String(cid)] : null;
    return {
      ...b,
      release_id: c?.doodba_release_id || null,
      current_docker_image: c?.current_docker_image || null,
      other_server_docker_image: c?.other_server_docker_image || null,
    };
  });

  const res = NextResponse.json({ ok: true, branches: enriched });
  res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
  return res;
}
