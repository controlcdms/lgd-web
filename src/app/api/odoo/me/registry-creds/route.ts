import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const githubLogin = (session as any)?.user?.githubLogin ?? null;
    let odooUserId = (session as any)?.user?.odooUserId ?? null;

    if (!githubLogin && !odooUserId) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    if (odooUserId && githubLogin) {
      const byId = await odooSearchRead(
        "res.users",
        [["id", "=", Number(odooUserId)]],
        ["id", "login", "git_username"],
        1
      );
      const row = byId?.[0];
      const login = String(row?.login || "");
      const gitUser = String(row?.git_username || "");
      if (login !== String(githubLogin) && gitUser !== String(githubLogin)) {
        odooUserId = null;
      }
    }

    if (!odooUserId && githubLogin) {
      let users = await odooSearchRead(
        "res.users",
        [["login", "=", String(githubLogin)]],
        ["id", "login", "git_username", "user_dockerhub", "pass_dockerfile", "registry_dockerfile"],
        1
      );

      if (!users?.length) {
        users = await odooSearchRead(
          "res.users",
          [["git_username", "=", String(githubLogin)]],
          ["id", "login", "git_username", "user_dockerhub", "pass_dockerfile", "registry_dockerfile"],
          1
        );
      }

      odooUserId = users?.[0]?.id ?? null;
      if (odooUserId) {
        const row = users?.[0] || {};
        const registry = String((row as any)?.registry_dockerfile || "registry.letsgodeploy.com").trim() || "registry.letsgodeploy.com";
        const username = String((row as any)?.user_dockerhub || "").trim();
        const password = String((row as any)?.pass_dockerfile || "").trim();
        return NextResponse.json(
          {
            ok: true,
            userId: odooUserId,
            registry,
            username,
            password,
          },
          { headers: { "Cache-Control": "private, no-store" } }
        );
      }
    }

    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "Usuario Odoo no encontrado", githubLogin }, { status: 404 });
    }

    const rows = await odooSearchRead(
      "res.users",
      [["id", "=", Number(odooUserId)]],
      ["id", "login", "git_username", "user_dockerhub", "pass_dockerfile", "registry_dockerfile"],
      1
    );

    const row = rows?.[0] || {};
    const registry = String((row as any)?.registry_dockerfile || "registry.letsgodeploy.com").trim() || "registry.letsgodeploy.com";
    const username = String((row as any)?.user_dockerhub || "").trim();
    const password = String((row as any)?.pass_dockerfile || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Credenciales de registry no disponibles", userId: odooUserId, registry, username: !!username, password: !!password },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        userId: odooUserId,
        registry,
        username,
        password,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
