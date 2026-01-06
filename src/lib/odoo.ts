// src/lib/odoo.ts
type Json = any;

const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_LOGIN = process.env.ODOO_USER!;
const ODOO_PASSWORD = process.env.ODOO_PASS!;

async function odooLogin(): Promise<{ uid: number; cookie: string }> {
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
    console.error("AUTH RESPONSE:", text);
    throw new Error("Odoo auth: missing set-cookie");
  }

  const cookie = setCookie.split(";")[0];
  const data = await r.json();

  const uid = data?.result?.uid;
  if (!uid) throw new Error("Odoo auth: uid missing");

  return { uid, cookie };
}

export async function odooCall<T = Json>(
  model: string,
  method: string,
  args: any[] = [],
  kwargs: Record<string, any> = {}
): Promise<T> {
  const { uid, cookie } = await odooLogin();

  const r = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs],
      },
    }),
    cache: "no-store",
  });

  const data = await r.json();

  if (data?.error) {
    throw new Error(
      data.error?.data?.message || data.error?.message || "Odoo RPC error"
    );
  }

  return data.result as T;
}

export async function odooSearchRead(
  model: string,
  domain: any[],
  fields: string[],
  limit = 80,
  offset = 0,
  order = ""
) {
  return odooCall<any[]>(model, "search_read", [domain, fields], {
    limit,
    offset,
    order,
  });
}

export async function odooWrite(
  model: string,
  ids: number[],
  values: Record<string, any>
) {
  return odooCall<boolean>(model, "write", [ids, values]);
}

export async function odooCreate(model: string, values: Record<string, any>) {
  return odooCall<number>(model, "create", [values]);
}

export async function odooExecute(model: string, method: string, ids: number[]) {
  // para métodos tipo: recordset.method()
  return odooCall<any>(model, method, [ids]);
}
