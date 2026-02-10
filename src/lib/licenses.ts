export type LicenseType =
  | "prod_premium"
  | "prod_simple"
  | "staging_simple"
  | "testing";

export const LICENSE_META: Record<
  LicenseType,
  {
    title: string;
    desc: string;
    // Odoo product default_code used to resolve the monthly license product.
    // You can override via env LICENSE_PRODUCT_CODE_<TYPE>.
    defaultCode: string;
  }
> = {
  prod_premium: {
    title: "Producción Premium",
    desc: "Instancias productivas (plan Premium). 1 licencia = 1 instancia running.",
    defaultCode: "LGD_LIC_PROD_PREMIUM",
  },
  prod_simple: {
    title: "Producción Simple",
    desc: "Instancias productivas (plan Simple). 1 licencia = 1 instancia running.",
    defaultCode: "LGD_LIC_PROD_SIMPLE",
  },
  staging_simple: {
    title: "Staging",
    desc: "Entorno de staging (equivale a Simple). 1 licencia = 1 instancia running.",
    defaultCode: "LGD_LIC_STAGING_SIMPLE",
  },
  testing: {
    title: "Testing",
    desc: "Entorno de testing. 1 licencia = 1 instancia running.",
    defaultCode: "LGD_LIC_TESTING",
  },
};

export function resolveLicenseDefaultCode(t: LicenseType): string {
  const envKey = `LICENSE_PRODUCT_CODE_${t.toUpperCase()}`;
  const override = (process.env as any)?.[envKey] as string | undefined;
  return (override && override.trim()) || LICENSE_META[t].defaultCode;
}
