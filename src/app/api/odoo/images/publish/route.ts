import { NextResponse } from "next/server";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function POST(req: Request) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const templateId = Number((body as any)?.template_id || 0);
    const message = String((body as any)?.message || "").trim();
    const resume = String((body as any)?.resume || "").trim();

    if (!templateId) return NextResponse.json({ ok: false, error: "template_id requerido" }, { status: 400 });
    if (!message) return NextResponse.json({ ok: false, error: "Release notes requerido" }, { status: 400 });

    const wizardId = await odooCallAsUser<number>(rpcAuth.uid, rpcAuth.apiKey,  "create.tag", "create", [
      { message, resume, doodba_template_id: templateId },
    ]);

    await odooCallAsUser<any>(rpcAuth.uid, rpcAuth.apiKey,  "create.tag", "add_branch", [[wizardId]]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error publicando" }, { status: 500 });
  }
}
