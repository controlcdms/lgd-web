import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    // Copia el domain de tu wizard (sin uid directo; en servidor ya estás autenticado)
    const domain = [
      ["doodba_tags.state", "=", "publish"],
      "|",
      ["image_type_scope", "=", "public_image"],
      ["user_id", "=", (session as any)?.odooUserId || false], // si no lo tienes, quita esta línea y deja solo public
    ];

    // Si no tienes odooUserId en sesión, usa solo public:
    const safeDomain = [["doodba_tags.state", "=", "publish"]];

    const rows = await odooSearchRead(
      "doodba.template",
      safeDomain,
      ["id", "name", "branch_version", "image_type_scope"],
      200,
      0,
      "name asc"
    );

    return NextResponse.json({ ok: true, templates: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
