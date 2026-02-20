import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const { id } = await ctx.params;
    const templateId = Number(id);
    const url = new URL(req.url);
    const releaseId = Number(url.searchParams.get("releaseId") || "");

    if (!Number.isFinite(templateId) || templateId <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }
    if (!Number.isFinite(releaseId) || releaseId <= 0) {
      return NextResponse.json({ ok: false, error: "releaseId inválido" }, { status: 400 });
    }

    const rows = await odooSearchRead(
      "container.deploy",
      [
        ["doodba_template_for_pipeline_id", "=", templateId],
        "|",
        ["doodba_release_id", "=", false],
        ["doodba_release_id", "!=", releaseId],
      ] as any,
      [
        "id",
        "pipeline_name",
        "container_status",
        "server_url_nginx",
        "current_docker_image",
        "doodba_release_id",
        "resource_deploy_id",
      ],
      500,
      0,
      "id desc"
    );

    return NextResponse.json({ ok: true, containers: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
