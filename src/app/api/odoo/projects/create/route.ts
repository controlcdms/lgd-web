import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    const base_version_id = Number(body?.base_version_id || body?.base_version || 0);

    if (!name) {
      return NextResponse.json({ ok: false, error: "Falta name" }, { status: 400 });
    }
    if (!base_version_id) {
      return NextResponse.json({ ok: false, error: "Falta base_version_id" }, { status: 400 });
    }

    const payload = {
      oauth_uid: String(githubId),
      name,
      base_version_id,
      base_version_tag_id: body?.base_version_tag_id ? Number(body.base_version_tag_id) : undefined,
      type_deploy_repository: String(body?.type_deploy_repository || "production_deploy"),
      webhook_alternative: body?.webhook_alternative ?? true,
      deploy_in_my_servers: body?.deploy_in_my_servers ?? false,
      developer_mode: body?.developer_mode ?? false,
    };

    const result = await odooCall<{ ok: boolean; repository_id: number }>(
      "create.repo.modern",
      "create_from_api",
      [payload]
    );

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
