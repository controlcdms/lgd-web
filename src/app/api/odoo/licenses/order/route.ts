import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { odooCreate, odooSearchRead } from "@/lib/odoo";
import type { LicenseType } from "@/lib/licenses";
import { resolveLicenseDefaultCode } from "@/lib/licenses";

function asStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

async function ensureOdooUser(req: Request, githubLogin: string) {
  // Mirror the logic from /api/odoo/me/token-lgd: try find; if missing, upsert.
  let users = await odooSearchRead(
    "res.users",
    [["login", "=", String(githubLogin)]],
    ["id", "login", "git_username", "oauth_uid", "partner_id"],
    1
  );

  if (!users?.length) {
    users = await odooSearchRead(
      "res.users",
      [["git_username", "=", String(githubLogin)]],
      ["id", "login", "git_username", "oauth_uid", "partner_id"],
      1
    );
  }

  if (users?.length) return users[0];

  const jwt = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  const access_token = (jwt as any)?.accessToken ?? null;
  const github_id = (jwt as any)?.githubId ?? null;

  if (!access_token) {
    throw new Error("Usuario Odoo no encontrado y falta accessToken para autocrear");
  }

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXTAUTH_URL no configurado (necesario para autocrear usuario)");
  }

  const r = await fetch(`${base}/api/odoo/me/upsert-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token,
      github_login: githubLogin,
      github_id,
    }),
    cache: "no-store",
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.ok === false) {
    throw new Error(d?.error || `No se pudo autocrear usuario Odoo (HTTP ${r.status})`);
  }

  // retry
  users = await odooSearchRead(
    "res.users",
    [["login", "=", String(githubLogin)]],
    ["id", "login", "git_username", "oauth_uid", "partner_id"],
    1
  );

  if (!users?.length) throw new Error("Usuario Odoo no disponible luego de upsert");
  return users[0];
}

async function resolveProductId(type: LicenseType): Promise<number> {
  const code = resolveLicenseDefaultCode(type);

  const products = await odooSearchRead(
    "product.product",
    [["default_code", "=", code]],
    ["id", "name", "default_code", "list_price"],
    1
  );

  const p = products?.[0];
  if (!p?.id) {
    throw new Error(
      `Producto de licencia no encontrado en Odoo: default_code=${code}. ` +
        `Crea el producto o configura LICENSE_PRODUCT_CODE_${type.toUpperCase()}.`
    );
  }

  return Number(p.id);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const githubLogin = (session as any)?.user?.githubLogin ?? null;

    if (!githubLogin) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const type = asStr(body?.type) as LicenseType;
    const monthsRaw = body?.months;
    const months = Number.isFinite(Number(monthsRaw)) ? Number(monthsRaw) : 1;

    const allowed: LicenseType[] = [
      "prod_premium",
      "prod_simple",
      "staging_simple",
      "testing",
    ];

    if (!allowed.includes(type)) {
      return NextResponse.json(
        { ok: false, error: "invalid type" },
        { status: 400 }
      );
    }

    if (!(months >= 1 && months <= 24)) {
      return NextResponse.json(
        { ok: false, error: "invalid months" },
        { status: 400 }
      );
    }

    const odooUser = await ensureOdooUser(req, String(githubLogin));
    const partnerId = Array.isArray(odooUser?.partner_id)
      ? odooUser.partner_id[0]
      : odooUser?.partner_id;

    if (!partnerId) {
      return NextResponse.json(
        { ok: false, error: "Usuario Odoo sin partner_id" },
        { status: 500 }
      );
    }

    const productId = await resolveProductId(type);

    // 1) Create sale.order
    const orderId = await odooCreate("sale.order", {
      partner_id: partnerId,
      // Link to the requesting user when possible (useful for internal reporting).
      user_id: odooUser.id,
      // Optionally tag origin.
      client_order_ref: `LGD-LIC-${type}-${githubLogin}`,
    });

    // 2) Create sale.order.line
    await odooCreate("sale.order.line", {
      order_id: orderId,
      product_id: productId,
      product_uom_qty: months,
    });

    // 3) Read order summary
    const orders = await odooSearchRead(
      "sale.order",
      [["id", "=", orderId]],
      ["id", "name", "state", "amount_total", "currency_id"],
      1
    );

    const order = orders?.[0] || { id: orderId };

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        name: order.name,
        state: order.state,
        amount_total: order.amount_total,
        currency_id: order.currency_id,
      },
      reference: order.name || `SO${orderId}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
