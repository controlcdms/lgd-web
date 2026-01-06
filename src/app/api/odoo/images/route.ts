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

    // puedes filtrar publish si quieres, pero para “Imágenes” normalmente quieres ver TODO
    const domain: any[] = [];

    const images = await odooSearchRead(
      "doodba.template",
      domain,
      [
        "id",
        "name",
        "branch_version",
        "image_type_scope",
        // si existen en tu modelo, luego activas:
        // "state",
        // "repo_full_name",
        // "pip_packages",
      ],
      500,
      0,
      "create_date desc"
    );

    return NextResponse.json({ ok: true, images });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
