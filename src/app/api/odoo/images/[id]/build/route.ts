import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const p = await params;
    const id = Number(p.id || 0);
    if (!id) return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });

    const result = await odooCallAsUser<unknown>(rpcAuth.uid, rpcAuth.apiKey,  "doodba.template", "create_doodba_tag_action", [[id]]);

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
