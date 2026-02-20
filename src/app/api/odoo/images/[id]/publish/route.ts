import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function POST(req: Request, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const templateId = Number(params?.id);
    if (!templateId || Number.isNaN(templateId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const resume = String(body?.resume || "");

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
