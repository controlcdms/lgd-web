import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

function cleanName(s: string) {
  return (s || "").trim();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = cleanName(body?.name);
    const branch_version = String(body?.branch_version || "17.0");
    const image_type_scope = String(body?.image_type_scope || "private_image");
    const description = String(body?.description || "");
    const commit = String(body?.commit || "").trim(); // opcional

    if (!name) {
      return NextResponse.json({ ok: false, error: "Falta name" }, { status: 400 });
    }

    // reglas básicas (parecidas a tu wizard Odoo, pero light)
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return NextResponse.json(
        { ok: false, error: "Nombre inválido: usa minúsculas, números y guiones; empieza con letra." },
        { status: 400 }
      );
    }
    if (!["16.0", "17.0", "18.0"].includes(branch_version)) {
      return NextResponse.json({ ok: false, error: "branch_version inválido" }, { status: 400 });
    }
    if (!["private_image", "public_image"].includes(image_type_scope)) {
      return NextResponse.json({ ok: false, error: "image_type_scope inválido" }, { status: 400 });
    }

    // OJO: en tu wizard Odoo validabas "por usuario". Aquí, como estamos usando credenciales técnicas,
    // solo aseguramos unicidad por name (si quieres, luego filtramos por user_id real).
    const existing = await odooCall<any[]>(
      "doodba.template",
      "search_read",
      [[["name", "=", name]], ["id"]],
      { limit: 1 }
    );
    if (existing.length) {
      return NextResponse.json({ ok: false, error: "Ya existe una imagen con ese nombre" }, { status: 400 });
    }

    const vals: Record<string, any> = {
      name,
      branch_version,
      image_type_scope,
      state: "name",
    };
    if (description) vals.description = description;

    // si en tu modelo existe campo "commit" o similar, lo seteas aquí
    // (si no existe, bórralo)
    if (commit) vals.commit = commit;

    const newId = await odooCall<number>("doodba.template", "create", [vals], {});
    return NextResponse.json({ ok: true, id: newId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
