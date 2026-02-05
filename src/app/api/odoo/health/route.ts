import { NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

export async function GET() {
  try {
    // Ping simple al backend Odoo
    const users = await odooCall<unknown>("res.users", "search_read", [[[]], ["id"]], { limit: 1 });
    return NextResponse.json({ ok: true, odoo: { ping: true, sample: users } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "health error" }, { status: 500 });
  }
}
