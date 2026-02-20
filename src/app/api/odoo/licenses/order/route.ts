import { NextResponse } from "next/server";
import { odooCallAsUser, odooSearchReadAsUser } from "@/lib/odoo";
import type { LicenseType } from "@/lib/licenses";
import { resolveLicenseDefaultCode } from "@/lib/licenses";
import { getOdooRpcAuth, requireOdooUserId } from "@/app/api/odoo/_authz";

function asStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

async function resolveProductId(login: string, apiKey: string, type: LicenseType): Promise<number> {
  const code = resolveLicenseDefaultCode(type);
  const products = await odooSearchReadAsUser(
    login,
    apiKey,
    "product.product",
    [["default_code", "=", code]],
    ["id", "name", "default_code", "list_price"],
    1
  );
  const p = products?.[0];
  if (!p?.id) throw new Error(`Producto de licencia no encontrado en Odoo: default_code=${code}`);
  return Number((p as any).id);
}

export async function POST(req: Request) {
  try {
    const odooUserId = await requireOdooUserId();
    if (!odooUserId) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const rpcAuth = await getOdooRpcAuth(req);
    if (!rpcAuth) return NextResponse.json({ ok: false, error: "No odooApiKey in token (re-login required)" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const type = asStr((body as any)?.type) as LicenseType;
    const monthsRaw = (body as any)?.months;
    const months = Number.isFinite(Number(monthsRaw)) ? Number(monthsRaw) : 1;

    const allowed: LicenseType[] = ["prod_premium", "prod_simple", "staging_simple", "testing"];
    if (!allowed.includes(type)) return NextResponse.json({ ok: false, error: "invalid type" }, { status: 400 });
    if (!(months >= 1 && months <= 24)) return NextResponse.json({ ok: false, error: "invalid months" }, { status: 400 });

    const meRows = await odooSearchReadAsUser(rpcAuth.login, rpcAuth.apiKey, "res.users", [["id", "=", odooUserId]], ["id", "login", "partner_id"], 1);
    const me = meRows?.[0];
    const partnerId = Array.isArray((me as any)?.partner_id) ? (me as any).partner_id[0] : (me as any)?.partner_id;
    if (!partnerId) return NextResponse.json({ ok: false, error: "Usuario Odoo sin partner_id" }, { status: 500 });

    const productId = await resolveProductId(rpcAuth.login, rpcAuth.apiKey, type);

    const orderId = await odooCallAsUser<number>(rpcAuth.login, rpcAuth.apiKey, "sale.order", "create", [{
      partner_id: partnerId,
      user_id: odooUserId,
      client_order_ref: `LGD-LIC-${type}-${rpcAuth.login}`,
    }]);

    await odooCallAsUser<number>(rpcAuth.login, rpcAuth.apiKey, "sale.order.line", "create", [{
      order_id: orderId,
      product_id: productId,
      product_uom_qty: months,
    }]);

    const orders = await odooSearchReadAsUser(
      rpcAuth.login,
      rpcAuth.apiKey,
      "sale.order",
      [["id", "=", orderId]],
      ["id", "name", "state", "amount_total", "currency_id"],
      1
    );

    const order = orders?.[0] || ({ id: orderId } as any);
    return NextResponse.json({
      ok: true,
      order: {
        id: (order as any).id,
        name: (order as any).name,
        state: (order as any).state,
        amount_total: (order as any).amount_total,
        currency_id: (order as any).currency_id,
      },
      reference: (order as any).name || `SO${orderId}`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
