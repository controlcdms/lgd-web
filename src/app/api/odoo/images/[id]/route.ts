import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

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
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    // tu user en Odoo
    const users = await odooSearchRead(
      "res.users",
      [["oauth_uid", "=", String(githubId)]],
      ["id"],
      1
    );
    if (!users.length) {
      return NextResponse.json({ ok: false, error: "Usuario Odoo no encontrado" }, { status: 404 });
    }
    const odooUserId = users[0].id;

    // leer template (AJUSTA modelo/campos si tu modelo se llama distinto)
    const rows = await odooSearchRead(
      "doodba.template",
      [
        ["id", "=", imageId],
        ["user_id", "=", odooUserId], // evita que vean templates ajenos
      ],
      [
        "id",
        "name",
        "branch_version",
        "image_type_scope",
        "state",
        "description",
        "resume",
      ],
      1
    );

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "Imagen no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, image: rows[0] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error cargando imagen" },
      { status: 500 }
    );
  }
}
