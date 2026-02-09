import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooSearchRead } from "@/lib/odoo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    const githubLogin = (session as any)?.user?.githubLogin ?? null;

    // Resolve current Odoo user id (needed to filter private templates).
    let odooUserId: number | null = null;
    if (githubLogin) {
      // Primary mapping: login
      let users = await odooSearchRead(
        "res.users",
        [["login", "=", String(githubLogin)]],
        ["id"],
        1
      );
      // Fallback: git_username
      if (!users?.length) {
        users = await odooSearchRead(
          "res.users",
          [["git_username", "=", String(githubLogin)]],
          ["id"],
          1
        );
      }
      odooUserId = users?.[0]?.id ?? null;
    }

    // Only list templates that are published AND (public OR owned by current user).
    const domain: any[] = [
      ["doodba_tags.state", "=", "publish"],
      "&",
      "|",
      ["image_type_scope", "=", "public_image"],
      ["user_id", "=", odooUserId || -1],
    ];

    const rows = await odooSearchRead(
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
