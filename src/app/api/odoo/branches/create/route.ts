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

    const repository_id = Number((body as any)?.repository_id || 0);
    const type = String((body as any)?.type || "staging").toLowerCase();
    const name = String((body as any)?.name || "").trim();

    if (!repository_id) return NextResponse.json({ ok: false, error: "repository_id requerido" }, { status: 400 });
    if (!type) return NextResponse.json({ ok: false, error: "type requerido" }, { status: 400 });

    const payload: Record<string, unknown> = {
      oauth_uid: String(githubId || ""),
      repository_id,
      type,
    };

    if (type !== "production") payload.name = name;
    if ((body as any)?.license_id) payload.license_id = Number((body as any).license_id);
    if ((body as any)?.base_version_id) payload.base_version_id = Number((body as any).base_version_id);
    if ((body as any)?.base_version_tag_id) payload.base_version_tag_id = Number((body as any).base_version_tag_id);

    const result = await odooCallAsUser<{ ok: boolean; branch_id: number; branch_name: string }>(
      rpcAuth.login,
      rpcAuth.apiKey,
      "create.staging.modern",
      "create_from_api",
      [payload]
    );

    const { oauth_uid, ...payloadPublic } = payload;
    return NextResponse.json({ ok: true, result, payload: payloadPublic });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
