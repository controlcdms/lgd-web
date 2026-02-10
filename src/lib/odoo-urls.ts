// Centralized Odoo URLs.
// - INTERNAL: used for server-to-server calls from Next (can be Docker network hostname)
// - PUBLIC: used for links opened in the user's browser

export function odooUrlInternal(): string {
  return String(process.env.ODOO_URL_INTERNAL || process.env.ODOO_URL || "").replace(/\/+$/, "");
}

export function odooUrlPublic(): string {
  return String(process.env.ODOO_URL_PUBLIC || process.env.ODOO_URL || "").replace(/\/+$/, "");
}
