import { NextResponse } from "next/server";
import { odooSearchReadAsUser } from "@/lib/odoo";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

export async function GET(req: Request) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) {
      return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });
    }

    const domain: any[] = [
      "&",
      ["doodba_tags.state", "=", "publish"],
      "|",
      ["image_type_scope", "=", "public_image"],
      ["user_id", "=", odooUserId],
    ];

    const rows = await odooSearchReadAsUser(
      rpcAuth.uid,
      rpcAuth.apiKey,
      "doodba.template",
      domain,
      ["id", "name", "branch_version", "image_type_scope"],
      200,
      0,
      "name asc"
    );

    const res = NextResponse.json({ ok: true, templates: rows });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
