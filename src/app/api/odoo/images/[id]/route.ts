import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const imageId = Number(id);

  if (!Number.isFinite(imageId)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    const githubLogin = (session as any)?.user?.githubLogin;
    const githubId = (session as any)?.user?.githubId;

    if (!githubLogin && !githubId) {
      return NextResponse.json({ ok: false, error: "No auth user" }, { status: 401 });
    }

    const img = await odooCall<any>("doodba.template", "api_get_visible_image", [
      imageId,
      String(githubId || ""),
      String(githubLogin || ""),
    ]);

    if (!img) {
      return NextResponse.json({ ok: false, error: "Imagen no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, image: img });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error cargando imagen" },
      { status: 500 }
    );
  }
}
