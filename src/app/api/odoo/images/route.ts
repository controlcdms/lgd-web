import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const odooUserId = Number((session as any)?.user?.odooUserId || 0) || null;
    const githubLogin = (session as any)?.user?.githubLogin || "";
    const githubId = (session as any)?.user?.githubId || "";

    if (!odooUserId) {
      return NextResponse.json({ ok: false, error: "No odooUserId in session" }, { status: 401 });
    }

    const images = await odooCall<any[]>("doodba.template", "api_list_visible_images", [
      String(githubId || ""),
      String(githubLogin || ""),
      200,
    ]);

    const res = NextResponse.json({ ok: true, images });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
