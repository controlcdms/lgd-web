import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    // si quieres filtrar por usuario actual en Odoo, acá deberías mapearlo a res.users
    // por ahora: traemos todo (o mete dominio por user_id si tu modelo lo tiene)
    const domain: any[] = []; // ej: [["user_id", "=", odooUserId]]

    const images = await odooCall<any[]>(
      "doodba.template",
      "search_read",
      [domain, ["id", "name", "branch_version", "image_type_scope", "state"]],
      { limit: 200, order: "id desc" }
    );

    return NextResponse.json({ ok: true, images });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
