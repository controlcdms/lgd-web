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

    // Primero leemos la imagen por ID (sin filtrar por usuario) para saber si es pública.
    const baseRows = await odooSearchRead(
      "doodba.template",
      [["id", "=", imageId]],
      [
        "id",
        "name",
        "branch_version",
        "image_type_scope",
        "state",
        "description",
        "resume",
        "user_id",
      ],
      1
    );

    if (!baseRows.length) {
      return NextResponse.json({ ok: false, error: "Imagen no encontrada" }, { status: 404 });
    }

    const img = baseRows[0];
    const scope = String(img?.image_type_scope || "");

    // Si es pública, cualquier usuario autenticado la puede ver.
    if (scope === "public_image") {
      return NextResponse.json({ ok: true, image: img });
    }

    // Si NO es pública, restringimos por usuario dueño.
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

    const ownerId = Array.isArray(img?.user_id) ? img.user_id[0] : img?.user_id;
    if (Number(ownerId) !== Number(odooUserId)) {
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
