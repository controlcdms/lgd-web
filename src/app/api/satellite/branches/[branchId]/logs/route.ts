import { NextRequest, NextResponse } from "next/server";
import { getSatConfigFromBranch, satFetchJson } from "../_lib";

export async function POST(req: NextRequest, context: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await context.params;
  const id = Number(branchId);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "Invalid branchId" }, { status: 400 });

  let cfg: Awaited<ReturnType<typeof getSatConfigFromBranch>> | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const service = String(body?.service || "odoo");
    const tail = Number(body?.tail || 200);

    cfg = await getSatConfigFromBranch(id);
    const j = await satFetchJson(cfg, "/stack/logs", { stack: cfg.stack, service, tail });
    return NextResponse.json({ ok: true, config: { stack: cfg.stack, baseUrl: cfg.baseUrl }, ...j });
  } catch (e: any) {
    const config = cfg ? { stack: cfg.stack, baseUrl: cfg.baseUrl } : undefined;
    return NextResponse.json({ ok: false, error: e?.message || String(e), config }, { status: 500 });
  }
}
