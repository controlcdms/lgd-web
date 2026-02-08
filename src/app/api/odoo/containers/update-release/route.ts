import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const githubLogin = (session as any)?.user?.githubLogin;
    if (!githubLogin) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const releaseId = Number(body?.releaseId);
    const containerIds: number[] = Array.isArray(body?.containerIds)
      ? body.containerIds.map(Number).filter((n: any) => Number.isFinite(n) && n > 0)
      : [];

    if (!Number.isFinite(releaseId) || releaseId <= 0) {
      return NextResponse.json({ ok: false, error: "releaseId inválido" }, { status: 400 });
    }
    if (!containerIds.length) {
      return NextResponse.json({ ok: false, error: "containerIds vacío" }, { status: 400 });
    }

    const results: Array<{ containerId: number; ok: boolean; error?: string }> = [];

    // Ejecutar uno por uno: mejor trazabilidad y evita romper todo por un fallo.
    for (const id of containerIds) {
      try {
        // execute_kw-style helper: call method with ids in args
        await odooCall<any>("container.deploy", "action_set_release_and_rebuild", [[id], releaseId], {});
        results.push({ containerId: id, ok: true });
      } catch (e: any) {
        results.push({
          containerId: id,
          ok: false,
          error: e?.message || String(e),
        });
      }
    }

    const okAll = results.every((r) => r.ok);
    return NextResponse.json({ ok: okAll, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
