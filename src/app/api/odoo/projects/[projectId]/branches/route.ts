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
    ],
    200,
    0,
    "type_deploy, name"
  );

  return NextResponse.json({ ok: true, branches });
}
