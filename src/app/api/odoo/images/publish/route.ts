import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCreate, odooExecute } from "@/lib/odoo";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const templateId = Number((body as any)?.template_id || 0);
    const message = String((body as any)?.message || "").trim();
    const resume = String((body as any)?.resume || "").trim();

    if (!templateId) {
      return NextResponse.json({ ok: false, error: "template_id requerido" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ ok: false, error: "Release notes requerido" }, { status: 400 });
    }

    const wizardId = await odooCreate("create.tag", {
      message,
      resume,
      doodba_template_id: templateId,
    });

    await odooExecute("create.tag", "add_branch", [wizardId]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error publicando" }, { status: 500 });
  }
}
