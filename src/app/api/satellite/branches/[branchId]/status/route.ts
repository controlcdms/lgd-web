import { NextRequest, NextResponse } from "next/server";
import { getSatConfigFromBranch, satFetchJson } from "../_lib";

export async function POST(_req: NextRequest, context: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await context.params;
  const id = Number(branchId);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "Invalid branchId" }, { status: 400 });

  let cfg: Awaited<ReturnType<typeof getSatConfigFromBranch>> | null = null;

  try {
    cfg = await getSatConfigFromBranch(id);
    const j = await satFetchJson(cfg, "/stack/status", { stack: cfg.stack });
    return NextResponse.json({ ok: true, config: { stack: cfg.stack, baseUrl: cfg.baseUrl }, ...j });
  } catch (e: any) {
    // Include config we resolved (if any) to make debugging stack/url issues easier.
    const config = cfg ? { stack: cfg.stack, baseUrl: cfg.baseUrl } : undefined;
    return NextResponse.json({ ok: false, error: e?.message || String(e), config }, { status: 500 });
  }
}
