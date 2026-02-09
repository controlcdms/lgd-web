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

    // List visible images via Odoo helper (sudo inside) because lgd-web-bot may not
    // have access to read `res.users`.
    const images = await odooCall<any[]>(
      "doodba.template",
      "api_list_visible_images",
      [String(githubId || ""), String(githubLogin || ""), 200]
    );

    // Cache a little to avoid hammering Odoo on every navigation.
    // Authenticated response => private.
    const res = NextResponse.json({ ok: true, images });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
