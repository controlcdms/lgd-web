import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const imageId = Number(id);
    if (!Number.isFinite(imageId) || imageId <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    const githubLogin = (session as any)?.user?.githubLogin || "";
    const githubId = (session as any)?.user?.githubId || "";
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const commitHash = String((body as any)?.commit || "").trim();

    await odooCall<any>("doodba.template", "api_set_commit", [
      imageId,
      commitHash,
      String(githubId || ""),
      String(githubLogin || ""),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
