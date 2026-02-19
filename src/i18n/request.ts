import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = (await requestLocale) as Locale | undefined;
  if (!locale || !locales.includes(locale)) locale = defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
