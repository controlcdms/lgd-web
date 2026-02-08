import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const githubLogin = (session as any)?.user?.githubLogin;
    const githubId = (session as any)?.user?.githubId;

    if (!githubLogin && !githubId) {
      return NextResponse.json({ ok: false, error: "No auth user" }, { status: 401 });
    }

    // Public images should be visible to everyone.
    // Private images should be visible only to the owning Odoo user.
    let odooUserId: number | null = null;

    // NOTE: In LGD Odoo DB `res.users` may not have github_login.
    // Prefer matching by `login`/`git_username`, fallback to oauth_uid.
    try {
      if (githubLogin) {
        const users = await odooCall<any[]>(
          "res.users",
          "search_read",
          [
            ["|", ["login", "=", String(githubLogin)], ["git_username", "=", String(githubLogin)]],
            ["id"],
          ],
          { limit: 1 }
        );
        odooUserId = users?.[0]?.id ?? null;
      }

      if (!odooUserId && githubId) {
        const users2 = await odooCall<any[]>(
          "res.users",
          "search_read",
          [[["oauth_uid", "=", String(githubId)]], ["id"]],
          { limit: 1 }
        );
        odooUserId = users2?.[0]?.id ?? null;
      }
    } catch {
      odooUserId = null;
    }

    const domain: any[] = odooUserId
      ? ["|", ["image_type_scope", "=", "public_image"], ["user_id", "=", odooUserId]]
      : [["image_type_scope", "=", "public_image"]];

    const images = await odooCall<any[]>(
      "doodba.template",
      "search_read",
      [domain, ["id", "name", "branch_version", "image_type_scope", "state"]],
      { limit: 200, order: "id desc" }
    );

    return NextResponse.json({ ok: true, images });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
