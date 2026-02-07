import { NextResponse } from "next/server";
import { odooCall, odooCreate, odooSearchRead, odooWrite } from "@/lib/odoo";

function asStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

async function getGithubProviderId(): Promise<number> {
  // In lgd1 we confirmed auth_oauth_provider 'GitHub' has id=4, but we still resolve dynamically.
  const rows = await odooSearchRead(
    "auth.oauth.provider",
    [["name", "=", "GitHub"]],
    ["id", "name", "enabled"],
    1
  );
  const id = rows?.[0]?.id;
  if (!id) throw new Error("GitHub OAuth provider no encontrado en Odoo");
  return Number(id);
}

async function ensureInternalGroup(userId: number) {
  // Make the user an internal user (base.group_user).
  // We resolve group id by xmlid to avoid hardcoding.
  let groupId: number | null = null;
  try {
    groupId = await odooCall<number>("ir.model.data", "xmlid_to_res_id", [
      "base.group_user",
      true,
    ]);
  } catch {
    groupId = null;
  }

  if (!groupId) return;

  await odooWrite("res.users", [userId], {
    // m2m command: replace groups
    groups_id: [[4, groupId]],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const access_token = asStr(body?.access_token).trim();
    const github_login = asStr(body?.github_login).trim();
    const github_id = asStr(body?.github_id).trim();

    if (!access_token) {
      return NextResponse.json(
        { ok: false, error: "missing access_token" },
        { status: 400 }
      );
    }
    if (!github_login) {
      return NextResponse.json(
        { ok: false, error: "missing github_login" },
        { status: 400 }
      );
    }

    const providerId = await getGithubProviderId();

    // 1) Try match by provider+oauth_uid
    let users: any[] = [];
    if (github_id) {
      users = await odooSearchRead(
        "res.users",
        [
          ["oauth_provider_id", "=", providerId],
          ["oauth_uid", "=", github_id],
        ],
        ["id", "login", "oauth_uid", "git_username"],
        1
      );
    }

    // 2) Fallback by login
    if (!users?.length) {
      users = await odooSearchRead(
        "res.users",
        [["login", "=", github_login]],
        ["id", "login", "oauth_uid", "git_username"],
        1
      );
    }

    let userId: number | null = users?.[0]?.id ?? null;

    if (!userId) {
      // Create user as internal.
      // We set login == github_login (invariant).
      userId = await odooCreate("res.users", {
        login: github_login,
        name: github_login,
        active: true,
        oauth_provider_id: providerId,
        oauth_uid: github_id || false,
        git_username: github_login,
        oauth_access_token: access_token,
      });

      await ensureInternalGroup(userId);

      return NextResponse.json({ ok: true, action: "created", userId });
    }

    // Existing user: enforce invariants + refresh token.
    const updates: Record<string, any> = {
      oauth_access_token: access_token,
      git_username: github_login,
      oauth_provider_id: providerId,
    };

    if (github_id) updates.oauth_uid = github_id;

    // Enforce login==github_login when possible (avoid collisions)
    const currentLogin = asStr(users?.[0]?.login);
    if (currentLogin && currentLogin !== github_login) {
      const clash = await odooSearchRead(
        "res.users",
        [["login", "=", github_login]],
        ["id"],
        1
      );
      if (!clash?.length) {
        updates.login = github_login;
      }
    }

    await odooWrite("res.users", [userId], updates);
    await ensureInternalGroup(userId);

    return NextResponse.json({ ok: true, action: "updated", userId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
