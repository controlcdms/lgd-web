import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCallAsUser } from "@/lib/odoo";
import { getOdooRpcAuth } from "@/app/api/odoo/_authz";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const t0 = Date.now();
  const { id } = await ctx.params;
  const imageId = Number(id);

  if (!Number.isFinite(imageId)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    const githubLogin = (session as any)?.user?.githubLogin || "";
    const githubId = (session as any)?.user?.githubId || "";

    if (!odooUserId) return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const tOdoo0 = Date.now();
    const img = await odooCallAsUser<any>(rpcAuth.login, rpcAuth.apiKey, "doodba.template", "api_get_visible_image", [
      imageId,
      String(githubId || ""),
      String(githubLogin || ""),
    ]);
    const tOdooMs = Date.now() - tOdoo0;

    if (!img) return NextResponse.json({ ok: false, error: "Imagen no encontrada" }, { status: 404 });

    const res = NextResponse.json({ ok: true, image: img });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    const totalMs = Date.now() - t0;
    res.headers.set("Server-Timing", `odoo;dur=${tOdooMs}, total;dur=${totalMs}`);
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error cargando imagen" }, { status: 500 });
  }
}
