import { NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

const ALLOWED = ["production_deploy","staging_deploy","testing_deploy","local_deploy"] as const;
type DeployType = typeof ALLOWED[number];

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const repositoryId = parseInt(projectId, 10);

    const { searchParams } = new URL(req.url);
    const deployTypeRaw = searchParams.get("deployType") || "";

    if (!repositoryId || Number.isNaN(repositoryId)) {
      return NextResponse.json({ ok: false, error: "Invalid projectId" }, { status: 400 });
    }

    if (!ALLOWED.includes(deployTypeRaw as DeployType)) {
      return NextResponse.json({ ok: false, error: "Invalid deployType" }, { status: 400 });
    }

    const deployType = deployTypeRaw as DeployType;

    console.log("🧩 [create-defaults] repositoryId=", repositoryId, "deployType=", deployType);

    const defaults = await odooCall(
      "server.repos",
      "get_branch_create_defaults_api",
      [repositoryId, deployType]
    );

    console.log("🧩 [create-defaults] defaults raw =", defaults);

    return NextResponse.json({ ok: true, defaults });
  } catch (e: any) {
    console.error("🧨 [create-defaults] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Error loading defaults" },
      { status: 500 }
    );
  }
}
