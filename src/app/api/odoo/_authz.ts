import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

export async function requireOdooUserId() {
  const session = await getServerSession(authOptions);
  const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
  return odooUserId;
}

export async function ensureBranchAccess(branchId: number, odooUserId: number) {
  const rows = await odooSearchRead(
    "server.branches",
    [
      ["id", "=", branchId],
      ["repository_id", "!=", false],
      "|",
      ["repository_id.user_id", "=", odooUserId],
      ["repository_id.owner_id", "=", odooUserId],
    ],
    ["id", "repository_id"],
    1
  );
  return rows?.[0] || null;
}
