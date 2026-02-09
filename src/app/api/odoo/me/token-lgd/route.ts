import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

export async function GET(req: Request) {
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

    let odooUserId = users?.[0]?.id ?? null;

    // Si el usuario no existe aún en Odoo, intentamos autocrearlo (best-effort)
    // usando los datos del JWT (accessToken, githubId).
    if (!odooUserId) {
      const jwt = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
      const access_token = (jwt as any)?.accessToken ?? null;
      const github_id = (jwt as any)?.githubId ?? null;

      if (access_token && githubLogin) {
        const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
        if (base) {
          const r = await fetch(`${base}/api/odoo/me/upsert-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token,
              github_login: githubLogin,
              github_id,
            }),
            cache: "no-store",
          }).catch(() => null);

          const d = await r?.json().catch(() => ({}));
          if (!r || !r.ok || d?.ok === false) {
            return NextResponse.json(
              {
                ok: false,
                error: "Usuario Odoo no encontrado (y no se pudo autocrear)",
                githubLogin,
                detail: d?.error || (r ? `HTTP ${r.status}` : "no response"),
              },
              { status: 404 }
            );
          }

          // retry search
          users = await odooSearchRead(
            "res.users",
            [["login", "=", String(githubLogin)]],
            ["id", "login", "git_username", "oauth_uid"],
            1
          );
          odooUserId = users?.[0]?.id ?? null;
        }
      }

      if (!odooUserId) {
        return NextResponse.json(
          { ok: false, error: "Usuario Odoo no encontrado", githubLogin },
          { status: 404 }
        );
      }
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

    const res = NextResponse.json({
      ok: true,
      token_lgd: resource.token_lgd,
      resourceId: resource.id,
    });
    // Token is long-lived per user; cache in browser to avoid repeated Odoo hits.
    res.headers.set("Cache-Control", "private, max-age=3600, stale-while-revalidate=86400");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
