import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { odooSearchReadAsUser } from "@/lib/odoo";

export async function requireOdooUserId() {
  const session = await getServerSession(authOptions);
  const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
  return odooUserId;
}

export async function getOdooRpcAuth(req: Request): Promise<{ login: string; apiKey: string } | null> {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  const login = String((token as any)?.odooLogin || (token as any)?.githubLogin || "").trim();
  const apiKey = String((token as any)?.odooApiKey || "").trim();
  if (!login || !apiKey) return null;
  return { login, apiKey };
}

export async function ensureBranchAccessAsUser(req: Request, branchId: number) {
  const rpcAuth = await getOdooRpcAuth(req);
  if (!rpcAuth) return null;

  const rows = await odooSearchReadAsUser(
    rpcAuth.login,
    rpcAuth.apiKey,
    "server.branches",
    [["id", "=", branchId], ["repository_id", "!=", false]],
    ["id", "repository_id"],
    1
  );

  return rows?.[0] || null;
}
