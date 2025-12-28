import { NextResponse } from "next/server";
import { odooAuthenticate } from "@/lib/odoo";

export async function GET() {
  try {
    const res = await odooAuthenticate();
    return NextResponse.json({ ok: true, odoo: res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

