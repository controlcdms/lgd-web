import { NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

function asStr(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const access_token = asStr((body as any)?.access_token).trim();
    const github_login = asStr((body as any)?.github_login).trim();
    const github_id = asStr((body as any)?.github_id).trim();
    const email = asStr((body as any)?.email).trim();

    if (!access_token) {
      return NextResponse.json({ ok: false, error: "missing access_token" }, { status: 400 });
    }
    if (!github_login) {
      return NextResponse.json({ ok: false, error: "missing github_login" }, { status: 400 });
    }

    const result = await odooCall<any>("res.users", "upsert_from_github_login", [
      github_login,
      github_id || false,
      access_token,
      email || false,
    ]);

    return NextResponse.json({
      ok: true,
      action: result?.action || "updated",
      userId: Number(result?.user_id || 0) || null,
      login: result?.login || github_login,
      // No exponer api_key al frontend por defecto
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
