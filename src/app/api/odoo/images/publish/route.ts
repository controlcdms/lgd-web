// src/app/api/odoo/images/publish/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCreate, odooExecute } from "@/lib/odoo";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, error: "No auth" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const templateId = Number(body?.template_id || 0);
    const message = String(body?.message || "").trim();
    const resume = String(body?.resume || "").trim();

    if (!templateId) {
      return NextResponse.json(
        { ok: false, error: "template_id requerido" },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Release notes requerido" },
        { status: 400 }
      );
    }

    // 1) crear wizard transient
    const wizardId = await odooCreate("create.tag", {
      message,
      resume, // en tu wizard era readonly, pero no molesta enviarlo
      doodba_template_id: templateId,
    });

    // 2) ejecutar add_branch (lo que hace “Confirm”)
    await odooExecute("create.tag", "add_branch", [wizardId]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error publicando" },
      { status: 500 }
    );
  }
}
