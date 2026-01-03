import { NextResponse } from "next/server";
import { odooCall, odooSearchRead } from "@/lib/odoo";

type DeployType =
  | "production_deploy"
  | "staging_deploy"
  | "testing_deploy"
  | "local_deploy";

type Body = {
  name?: string;
  deployType?: DeployType;
  type_deploy?: DeployType;
  license_id?: number | null;
  server_id?: number | null;
  base_version_tag_id?: number | null;
};

const ALLOWED_DEPLOY_TYPES: DeployType[] = [
  "production_deploy",
  "staging_deploy",
  "testing_deploy",
  "local_deploy",
];

export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await ctx.params;
    const repositoryId = parseInt(projectId, 10);

    if (!repositoryId || Number.isNaN(repositoryId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid project id" },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    // --- name ---
    if (typeof body?.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "Invalid name" }, { status: 400 });
    }
    const name = body.name.trim();

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return NextResponse.json(
        { ok: false, error: "Invalid branch name format" },
        { status: 400 }
      );
    }

    // --- deployType ---
    const rawDeployType =
      (body as any)?.deployType ?? (body as any)?.type_deploy;

    if (!ALLOWED_DEPLOY_TYPES.includes(rawDeployType as DeployType)) {
      return NextResponse.json(
        { ok: false, error: "Invalid deployType" },
        { status: 400 }
      );
    }

    const deployType = rawDeployType as DeployType;

    // --- producción única ---
    if (deployType === "production_deploy") {
      const existing = await odooSearchRead(
        "server.branches",
        [["repository_id", "=", repositoryId], ["name", "=", "production"]],
        ["id"],
        1
      );
      if (existing.length) {
        return NextResponse.json(
          { ok: false, error: "Production branch already exists" },
          { status: 400 }
        );
      }
    }

    // ✅ 1) obtener defaults desde Odoo
    const defaults = await odooCall(
      "server.repos",
      "get_branch_create_defaults_api",
      [repositoryId, deployType]
    );
    console.log("[defaults raw]", defaults);


    // ✅ 2) resolver valores finales (frontend > defaults)
    const license_id =
      body?.license_id ?? defaults?.license?.id ?? false;

    const server_id =
      body?.server_id ?? defaults?.server?.id ?? false;

    const base_version_tag_id =
      body?.base_version_tag_id ?? defaults?.release?.id ?? false;

    console.log("[create branch params]", {
  repositoryId,
  name,
  deployType,
  license_id,
  server_id,
  base_version_tag_id,
});

    // --- crear rama ---
    const res = await odooCall(
      "server.repos",
      "create_branch_from_ui_api",
      [
        repositoryId,               // number
        name,                       // string
        deployType,                 // string
        {                           // opts dict
          license_id,
          server_id,
          base_version_tag_id,
        },
      ]
    );



    return NextResponse.json({
      ok: true,
      result: res,
      used_defaults: {
        license_id,
        server_id,
        base_version_tag_id,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error creating branch" },
      { status: 500 }
    );
  }
}
