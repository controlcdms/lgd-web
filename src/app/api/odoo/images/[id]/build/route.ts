import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, error: "No auth" }, { status: 401 });
    }

    const p = await params;
    const id = Number(p.id || 0);
    if (!id) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }

    // En OWL: doodba.template.create_doodba_tag_action([[imageId]])
    const result = await odooCall<unknown>("doodba.template", "create_doodba_tag_action", [[id]]);

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
