import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    const githubId = (session as any)?.user?.githubId;
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const name = String((body as any)?.name || "").trim();
    const base_version_id = Number((body as any)?.base_version_id || (body as any)?.base_version || 0);

    if (!name) return NextResponse.json({ ok: false, error: "Falta name" }, { status: 400 });
    if (!base_version_id) return NextResponse.json({ ok: false, error: "Falta base_version_id" }, { status: 400 });

    const payload = {
      oauth_uid: String(githubId || ""),
      name,
      base_version_id,
      base_version_tag_id: (body as any)?.base_version_tag_id ? Number((body as any).base_version_tag_id) : undefined,
      type_deploy_repository: String((body as any)?.type_deploy_repository || "production_deploy"),
      webhook_alternative: (body as any)?.webhook_alternative ?? true,
      deploy_in_my_servers: (body as any)?.deploy_in_my_servers ?? false,
      developer_mode: (body as any)?.developer_mode ?? false,
    };

    const result = await odooCallAsUser<{ ok: boolean; repository_id: number }>(
      rpcAuth.login,
      rpcAuth.apiKey,
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
