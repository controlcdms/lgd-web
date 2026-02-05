import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { odooCall } from "@/lib/odoo";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const githubId = (session as any)?.user?.githubId;
    if (!githubId) {
      return NextResponse.json({ ok: false, error: "No githubId" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const repository_id = Number(body?.repository_id || 0);
    const type = String(body?.type || "staging").toLowerCase();
    const name = String(body?.name || "").trim();

    if (!repository_id) {
      return NextResponse.json({ ok: false, error: "repository_id requerido" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ ok: false, error: "type requerido" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      oauth_uid: String(githubId),
      repository_id,
      type,
    };

    // name: requerido excepto production
    if (type !== "production") payload.name = name;
    if (body?.license_id) payload.license_id = Number(body.license_id);
    if (body?.base_version_id) payload.base_version_id = Number(body.base_version_id);
    if (body?.base_version_tag_id) payload.base_version_tag_id = Number(body.base_version_tag_id);

    const result = await odooCall<{ ok: boolean; branch_id: number; branch_name: string }>(
      "create.staging.modern",
      "create_from_api",
      [payload]
    );

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Error" }, { status: 500 });
  }
}
