import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const baseVersion = Number(body?.base_version);

    if (!name) {
      return NextResponse.json({ ok: false, error: "Falta name" }, { status: 400 });
    }
    if (!baseVersion) {
      return NextResponse.json(
        { ok: false, error: "Falta base_version" },
        { status: 400 }
      );
    }

    // 1) Crear wizard transient
    const wizId = await odooCall<number>("create.repo.modern", "create", [
      {
        name,
        base_version: baseVersion,
        // opcional: si quieres forzar defaults del wizard
        type_deploy_repository: "production_deploy",
        terms_and_conditions: true,
        personal_data_treatment: true,
      },
    ]);

    // 2) Ejecutar creación real
    await odooCall<boolean>("create.repo.modern", "add_repo", [[wizId]]);

    return NextResponse.json({ ok: true, wizard_id: wizId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
