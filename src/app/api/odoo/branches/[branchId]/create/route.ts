import { NextResponse } from "next/server";
import { odooCall, odooRead } from "@/lib/odoo"; // <- usa tus helpers (call/read)

type Body = {
  name: string;
  deployType: "production_deploy" | "staging_deploy" | "testing_deploy" | "local_deploy";
  // opcionales:
  license_id?: number | null;
  server_id?: number | null;
  base_version_tag_id?: number | null;
};

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params; // ✅ IMPORTANTE en Next (params es Promise)
    const repositoryId = parseInt(projectId, 10);

    if (!repositoryId || Number.isNaN(repositoryId)) {
      return NextResponse.json({ ok: false, error: "Invalid project id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.name || !body?.deployType) {
      return NextResponse.json({ ok: false, error: "Missing name/deployType" }, { status: 400 });
    }

    // validaciones rápidas (las fuertes deben vivir en Odoo)
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Invalid branch name" }, { status: 400 });
    }
    if (/[\\s!@#$%^&*(),.?":{}|<>]/.test(name)) {
      return NextResponse.json({ ok: false, error: "Name cannot contain spaces or special chars" }, { status: 400 });
    }
    if (/^[0-9]/.test(name)) {
      return NextResponse.json({ ok: false, error: "Name cannot start with a number" }, { status: 400 });
    }

    // opcional: si es production, puedes validar “solo una”
    if (body.deployType === "production_deploy") {
      const existing = await odooRead(
        "server.branches",
        [["repository_id", "=", repositoryId], ["name", "=", "production"]],
        ["id"],
        1
      );
      if (existing?.length) {
        return NextResponse.json(
          { ok: false, error: "Production branch already exists" },
          { status: 400 }
        );
      }
    }

    /**
     * ✅ aquí NO copies todo el wizard.
     * Lo correcto es llamar a UN método de Odoo que encapsule:
     * - licencia
     * - server define_server
     * - validations
     * - create_generic_branch(...)
     *
     * Ejemplo: server.repos.create_branch_from_ui(repository_id, name, deployType, opts)
     */
    const res = await odooCall(
      "server.repos",
      "create_branch_from_ui",
      [repositoryId, name, body.deployType, {
        license_id: body.license_id || false,
        server_id: body.server_id || false,
        base_version_tag_id: body.base_version_tag_id || false,
      }]
    );

    return NextResponse.json({ ok: true, result: res });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error creating branch" },
      { status: 500 }
    );
  }
}
