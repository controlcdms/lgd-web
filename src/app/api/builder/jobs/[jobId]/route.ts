import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await ctx.params;
    const url = `https://image.letsgodeploy.com/v2/jobs/${encodeURIComponent(jobId)}`;

    const r = await fetch(url, { cache: "no-store" });
    const txt = await r.text();
    let j: any;
    try {
      j = JSON.parse(txt);
    } catch {
      return NextResponse.json({ ok: false, error: txt.slice(0, 300) }, { status: 502 });
    }

    return NextResponse.json(j, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
