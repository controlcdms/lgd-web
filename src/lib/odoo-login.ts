// Helper: login to Odoo and return just the cookie for non-JSONRPC endpoints.

import { odooUrlInternal } from "@/lib/odoo-urls";

const ODOO_URL = odooUrlInternal();
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_LOGIN = process.env.ODOO_USER!;
const ODOO_PASSWORD = process.env.ODOO_PASS!;

export async function odooLoginCookie(): Promise<string> {
  if (!ODOO_URL || !ODOO_DB || !ODOO_LOGIN || !ODOO_PASSWORD) {
    throw new Error("Missing Odoo env vars (ODOO_URL/ODOO_DB/ODOO_USER/ODOO_PASS)");
  }

  const r = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { db: ODOO_DB, login: ODOO_LOGIN, password: ODOO_PASSWORD },
    }),
    cache: "no-store",
  });

  const setCookie = r.headers.get("set-cookie");
  if (!setCookie) {
    const text = await r.text();
    throw new Error("Odoo auth: missing set-cookie :: " + text.slice(0, 500));
  }

  // Keep only the session cookie.
  return setCookie.split(";")[0];
}
