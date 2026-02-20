import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

function cleanName(s: string) {
  return (s || "").trim();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    const githubId = (session as any)?.user?.githubId;
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = cleanName((body as any)?.name);
    const branch_version = String((body as any)?.branch_version || "17.0");
    const image_type_scope = String((body as any)?.image_type_scope || "private_image");
    const description = String((body as any)?.description || "");
    const custom_commit = Boolean((body as any)?.custom_commit);
    const commit = String((body as any)?.commit || "").trim();

    if (!name) return NextResponse.json({ ok: false, error: "Falta name" }, { status: 400 });
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return NextResponse.json({ ok: false, error: "Nombre inválido: usa minúsculas, números y guiones; empieza con letra." }, { status: 400 });
    }

    const payload = {
      oauth_uid: String(githubId || ""),
      name,
      branch_version,
      image_type_scope,
      description,
      custom_commit,
      commit,
    };

    const result = await odooCallAsUser<{ ok: boolean; image_id: number }>(
      rpcAuth.login,
      rpcAuth.apiKey,
      "create.image.wizard",
      "create_from_api",
      [payload]
    );

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
