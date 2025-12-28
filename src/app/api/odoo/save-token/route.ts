// src/app/api/odoo/save-token/route.ts
import { NextResponse } from "next/server";
import { odooSearchRead, odooWrite } from "@/lib/odoo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { github_login, email, access_token } = body;

    if (!access_token) {
      return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });
    }
    if (!github_login && !email) {
      return NextResponse.json({ ok: false, error: "missing github_login/email" }, { status: 400 });
    }

    // 1) Buscar usuario en Odoo (por login o email)
    const domain = email
      ? ["|", ["login", "=", github_login], ["login", "=", email]]
      : [["login", "=", github_login]];

    const users = await odooSearchRead(
      "res.users",
      domain as any,
      ["id", "login", "name"],
      1
    );

    if (!users?.length) {
      return NextResponse.json({ ok: false, error: "user not found in odoo" }, { status: 404 });
    }

    const userId = users[0].id;

    // 2) Guardar token en oauth_access_token
    const ok = await odooWrite("res.users", [userId], { oauth_access_token: access_token });

    return NextResponse.json({ ok: !!ok, userId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
