// src/lib/odoo.ts
type Json = any;

import { odooUrlInternal } from "@/lib/odoo-urls";

const ODOO_URL = odooUrlInternal();
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_LOGIN = process.env.ODOO_USER!;
const ODOO_PASSWORD = process.env.ODOO_PASS!;

type OdooSession = { uid: number; cookie: string };

async function odooLoginWithCredentials(login: string, secret: string): Promise<OdooSession> {
  const r = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { db: ODOO_DB, login, password: secret },
    }),
    cache: "no-store",
  });

  // NOTE: In Node/undici fetch, `headers.get('set-cookie')` is not reliable.
  // Use getSetCookie() when available.
  const setCookies = (r.headers as any).getSetCookie?.() as string[] | undefined;
  const setCookie = setCookies?.[0] || r.headers.get("set-cookie");

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

async function odooLogin(): Promise<OdooSession> {
  return odooLoginWithCredentials(ODOO_LOGIN, ODOO_PASSWORD);
}

async function odooExecuteKw<T = Json>(
  session: OdooSession,
  credential: string,
  model: string,
  method: string,
  args: any[] = [],
  kwargs: Record<string, any> = {}
): Promise<T> {
  const r = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: session.cookie },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [ODOO_DB, session.uid, credential, model, method, args, kwargs],
      },
    }),
    cache: "no-store",
  });

  const data = await r.json();

  if (data?.error) {
    throw new Error(data.error?.data?.message || data.error?.message || "Odoo RPC error");
  }

  return data.result as T;
}

export async function odooCall<T = Json>(
  model: string,
  method: string,
  args: any[] = [],
  kwargs: Record<string, any> = {}
): Promise<T> {
  const session = await odooLogin();
  return odooExecuteKw<T>(session, ODOO_PASSWORD, model, method, args, kwargs);
}

export async function odooCallAsUser<T = Json>(
  uid: number,
  apiKey: string,
  model: string,
  method: string,
  args: any[] = [],
  kwargs: Record<string, any> = {}
): Promise<T> {
  // IMPORTANT: GitHub-synced users may not have a usable Odoo password.
  // For user-scoped calls, use execute_kw with (uid, apiKey) directly.
  if (!uid || uid <= 0) throw new Error("Missing uid for user-scoped Odoo call");
  if (!apiKey) throw new Error("Missing apiKey for user-scoped Odoo call");

  const r = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [ODOO_DB, uid, apiKey, model, method, args, kwargs],
      },
    }),
    cache: "no-store",
  });

  const data = await r.json();
  if (data?.error) {
    throw new Error(data.error?.data?.message || data.error?.message || "Odoo RPC error");
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

export async function odooSearchReadAsUser(
  uid: number,
  apiKey: string,
  model: string,
  domain: any[],
  fields: string[],
  limit = 80,
  offset = 0,
  order = ""
) {
  return odooCallAsUser<any[]>(uid, apiKey, model, "search_read", [domain, fields], {
    limit,
    offset,
    order,
  });
}

export async function odooWrite(model: string, ids: number[], values: Record<string, any>) {
  return odooCall<boolean>(model, "write", [ids, values]);
}

export async function odooCreate(model: string, values: Record<string, any>) {
  return odooCall<number>(model, "create", [values]);
}

export async function odooExecute(model: string, method: string, ids: number[]) {
  return odooCall<any>(model, method, [ids]);
}
