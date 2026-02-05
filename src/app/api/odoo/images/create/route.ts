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
    const custom_commit = Boolean(body?.custom_commit);
    const commit = String(body?.commit || "").trim();

    if (!name) {
      return NextResponse.json({ ok: false, error: "Falta name" }, { status: 400 });
    }

    // reglas básicas
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return NextResponse.json(
        { ok: false, error: "Nombre inválido: usa minúsculas, números y guiones; empieza con letra." },
        { status: 400 }
      );
    }

    const payload = {
      oauth_uid: String(githubId),
      name,
      branch_version,
      image_type_scope,
      description,
      custom_commit,
      commit,
    };

    const result = await odooCall<{ ok: boolean; image_id: number }>(
      "create.image.wizard",
      "create_from_api",
      [payload]
    );

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
