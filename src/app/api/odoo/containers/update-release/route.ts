import { NextResponse } from "next/server";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function POST(req: Request) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const releaseId = Number((body as any)?.releaseId);
    const containerIds: number[] = Array.isArray((body as any)?.containerIds)
      ? (body as any).containerIds.map(Number).filter((n: any) => Number.isFinite(n) && n > 0)
      : [];

    if (!Number.isFinite(releaseId) || releaseId <= 0) {
      return NextResponse.json({ ok: false, error: "releaseId inválido" }, { status: 400 });
    }
    if (!containerIds.length) {
      return NextResponse.json({ ok: false, error: "containerIds vacío" }, { status: 400 });
    }

    const results: Array<{ containerId: number; ok: boolean; error?: string }> = [];

    for (const id of containerIds) {
      try {
        await odooCallAsUser<any>(
          rpcAuth.uid,
          rpcAuth.apiKey,
          "container.deploy",
          "action_set_release_and_rebuild",
          [[id], releaseId],
          {}
        );
        results.push({ containerId: id, ok: true });
      } catch (e: any) {
        results.push({ containerId: id, ok: false, error: e?.message || String(e) });
      }
    }

    const okAll = results.every((r) => r.ok);
    return NextResponse.json({ ok: okAll, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
