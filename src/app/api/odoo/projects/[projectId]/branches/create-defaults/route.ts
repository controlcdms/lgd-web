import { NextResponse } from "next/server";
import { odooCallAsUser, odooSearchReadAsUser } from "@/lib/odoo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

const ALLOWED = ["production_deploy", "staging_deploy", "testing_deploy", "local_deploy"] as const;
type DeployType = (typeof ALLOWED)[number];

async function ensureProjectAccessAsUser(req: Request, projectId: number) {
  const rpcAuth = await getOdooRpcAuth(req);
  if (!rpcAuth) return null;
  const rows = await odooSearchReadAsUser(rpcAuth.login, rpcAuth.apiKey, "server.repos", [["id", "=", projectId]], ["id"], 1);
  return rows?.[0] || null;
}

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const { projectId } = await ctx.params;
    const repositoryId = parseInt(projectId, 10);

    const { searchParams } = new URL(req.url);
    const deployTypeRaw = searchParams.get("deployType") || "";

    if (!repositoryId || Number.isNaN(repositoryId)) {
      return NextResponse.json({ ok: false, error: "Invalid projectId" }, { status: 400 });
    }

    const hasAccess = await ensureProjectAccessAsUser(req, repositoryId);
    if (!hasAccess) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (!ALLOWED.includes(deployTypeRaw as DeployType)) {
      return NextResponse.json({ ok: false, error: "Invalid deployType" }, { status: 400 });
    }

    const deployType = deployTypeRaw as DeployType;

    const defaults = await odooCallAsUser(rpcAuth.login, rpcAuth.apiKey, "server.repos", "get_branch_create_defaults_api", [repositoryId, deployType]);

    return NextResponse.json({ ok: true, defaults });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error loading defaults" }, { status: 500 });
  }
}
