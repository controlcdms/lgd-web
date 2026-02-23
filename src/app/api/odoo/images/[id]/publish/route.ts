import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

export async function POST(req: Request, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const templateId = Number(params?.id);
    if (!templateId || Number.isNaN(templateId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const resume = String((body as any)?.resume || "");

    const newId = await odooCallAsUser<number>(rpcAuth.uid, rpcAuth.apiKey,  "doodba.tag", "create", [
      { template_id: templateId, resume },
    ]);

    return NextResponse.json({ ok: true, id: newId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
