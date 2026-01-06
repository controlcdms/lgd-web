import { NextResponse } from "next/server";

export async function GET() {
  // action XML ID de Odoo
  const actionId = "action_create_image_wizard";
  const url = `${process.env.ODOO_BASE_URL}/web#action=${actionId}`;
  return NextResponse.json({ ok: true, url });
}
