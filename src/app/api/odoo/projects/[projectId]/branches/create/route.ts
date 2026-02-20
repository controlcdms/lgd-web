import { NextResponse } from "next/server";
import { odooCallAsUser, odooSearchReadAsUser } from "@/lib/odoo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

type DeployType = "production_deploy" | "staging_deploy" | "testing_deploy" | "local_deploy";

type Body = {
  name?: string;
  deployType?: DeployType;
  type_deploy?: DeployType;
  license_id?: number | null;
  server_id?: number | null;
  base_version_tag_id?: number | null;
};

const ALLOWED_DEPLOY_TYPES: DeployType[] = ["production_deploy", "staging_deploy", "testing_deploy", "local_deploy"];

async function ensureProjectAccessAsUser(req: Request, projectId: number) {
  const rpcAuth = await getOdooRpcAuth(req);
  if (!rpcAuth) return null;
  const rows = await odooSearchReadAsUser(rpcAuth.login, rpcAuth.apiKey, "server.repos", [["id", "=", projectId]], ["id"], 1);
  return rows?.[0] || null;
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const { projectId } = await ctx.params;
    const repositoryId = parseInt(projectId, 10);
    if (!repositoryId || Number.isNaN(repositoryId)) {
      return NextResponse.json({ ok: false, error: "Invalid project id" }, { status: 400 });
    }

    const hasAccess = await ensureProjectAccessAsUser(req, repositoryId);
    if (!hasAccess) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as Body | null;
    if (typeof body?.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "Invalid name" }, { status: 400 });
    }
    const name = body.name.trim();

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return NextResponse.json({ ok: false, error: "Invalid branch name format" }, { status: 400 });
    }

    const rawDeployType = (body as any)?.deployType ?? (body as any)?.type_deploy;
    if (!ALLOWED_DEPLOY_TYPES.includes(rawDeployType as DeployType)) {
      return NextResponse.json({ ok: false, error: "Invalid deployType" }, { status: 400 });
    }
    const deployType = rawDeployType as DeployType;

    if (deployType === "production_deploy") {
      const existing = await odooSearchReadAsUser(
        rpcAuth.login,
        rpcAuth.apiKey,
        "server.branches",
        [["repository_id", "=", repositoryId], ["name", "=", "production"]],
        ["id"],
        1
      );
      if (existing.length) {
        return NextResponse.json({ ok: false, error: "Production branch already exists" }, { status: 400 });
      }
    }

    const defaults = await odooCallAsUser(rpcAuth.login, rpcAuth.apiKey, "server.repos", "get_branch_create_defaults_api", [repositoryId, deployType]);

    const license_id = body?.license_id ?? (defaults as any)?.license?.id ?? false;
    const server_id = body?.server_id ?? (defaults as any)?.server?.id ?? false;
    const base_version_tag_id = body?.base_version_tag_id ?? (defaults as any)?.release?.id ?? false;

    const res = await odooCallAsUser(rpcAuth.login, rpcAuth.apiKey, "server.repos", "create_branch_from_ui_api", [
      repositoryId,
      name,
      deployType,
      { license_id, server_id, base_version_tag_id },
    ]);

    return NextResponse.json({ ok: true, result: res, used_defaults: { license_id, server_id, base_version_tag_id } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error creating branch" }, { status: 500 });
  }
}
