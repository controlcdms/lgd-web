import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const githubLogin = (session as any)?.user?.githubLogin ?? null;

    if (!githubLogin) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Map Next user -> Odoo user by login.
    // Nota: en lgd1 no existe res.users.github_login; el login suele coincidir con el githubLogin.
    let users = await odooSearchRead(
      "res.users",
      [["login", "=", String(githubLogin)]],
      ["id", "login", "git_username", "oauth_uid"],
      1
    );

    // Fallback: algunos usuarios usan git_username como identificador humano.
    if (!users?.length) {
      users = await odooSearchRead(
        "res.users",
        [["git_username", "=", String(githubLogin)]],
        ["id", "login", "git_username", "oauth_uid"],
        1
      );
    }

    const odooUserId = users?.[0]?.id ?? null;
    if (!odooUserId) {
      return NextResponse.json(
        { ok: false, error: "Usuario Odoo no encontrado", githubLogin },
        { status: 404 }
      );
    }

    const resources = await odooSearchRead(
      "server.resource",
      [["user_id", "=", odooUserId]],
      ["id", "name", "token_lgd"],
      1
    );

    const resource = resources?.[0] ?? null;
    if (!resource?.token_lgd) {
      return NextResponse.json(
        { ok: false, error: "Token LGD no disponible", odooUserId },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, token_lgd: resource.token_lgd, resourceId: resource.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
