import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCallAsUser, odooSearchReadAsUser } from "@/lib/odoo";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

type LegacyType = "production" | "staging" | "testing" | "local";
type DeployType = "production_deploy" | "staging_deploy" | "testing_deploy" | "local_deploy";

const TYPE_MAP: Record<LegacyType, DeployType> = {
  production: "production_deploy",
  staging: "staging_deploy",
  testing: "testing_deploy",
  local: "local_deploy",
};

async function hasProductionBranch(uid: number, apiKey: string, repositoryId: number) {
  const rows = await odooSearchReadAsUser(
    uid,
    apiKey,
    "server.branches",
    [["repository_id", "=", repositoryId], ["name", "=", "production"], ["active", "=", true], ["branch_status", "not in", ["expired", "archived"]]],
    ["id"],
    1
  );
  return rows.length > 0;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const repositoryId = Number((body as any)?.repository_id || 0);
    const type = String((body as any)?.type || "staging").toLowerCase() as LegacyType;
    const requestedName = String((body as any)?.name || "").trim();
    const deployType = TYPE_MAP[type];

    if (!repositoryId) {
      return NextResponse.json({ ok: false, error: "repository_id requerido" }, { status: 400 });
    }
    if (!deployType) {
      return NextResponse.json({ ok: false, error: "type inválido" }, { status: 400 });
    }

    const name = type === "production" ? "production" : requestedName;
    if (!name) {
      return NextResponse.json({ ok: false, error: "name requerido" }, { status: 400 });
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return NextResponse.json({ ok: false, error: "Invalid branch name format" }, { status: 400 });
    }

    if (deployType === "staging_deploy" && !(await hasProductionBranch(rpcAuth.uid, rpcAuth.apiKey, repositoryId))) {
      return NextResponse.json({ ok: false, error: "No se puede crear staging sin una rama production activa" }, { status: 400 });
    }

    if (deployType === "production_deploy") {
      const existing = await odooSearchReadAsUser(
        rpcAuth.uid,
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

    const defaults = await odooCallAsUser<any>(
      rpcAuth.uid,
      rpcAuth.apiKey,
      "server.repos",
      "get_branch_create_defaults_api",
      [repositoryId, deployType]
    );

    const license_id = (body as any)?.license_id ?? defaults?.license?.id ?? false;
    const server_id = (body as any)?.server_id ?? defaults?.server?.id ?? false;
    const base_version_tag_id = (body as any)?.base_version_tag_id ?? defaults?.release?.id ?? false;
    const trace_id = String((body as any)?.trace_id || defaults?.trace_id || "").trim() || null;

    const result = await odooCallAsUser<any>(
      rpcAuth.uid,
      rpcAuth.apiKey,
      "server.repos",
      "create_branch_from_ui_api",
      [repositoryId, name, deployType, { license_id, server_id, base_version_tag_id, trace_id }, trace_id]
    );

    return NextResponse.json({ ok: true, result, used_defaults: { license_id, server_id, base_version_tag_id, deployType, name } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
