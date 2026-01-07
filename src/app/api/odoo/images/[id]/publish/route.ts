import { NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

export async function POST(req: Request, { params }: any) {
  try {
    const templateId = Number(params?.id);
    if (!templateId || Number.isNaN(templateId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const resume = String(body?.resume || "");

    // EJEMPLO: crear tag/publicación
    // Ajusta modelo/campos reales de tu Odoo
    const newId = await odooCall<number>("doodba.tag", "create", [
      {
        template_id: templateId,
        resume,
      },
    ]);

    return NextResponse.json({ ok: true, id: newId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
