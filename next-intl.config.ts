import { defaultLocale, locales } from "./src/i18n/routing";

export default {
  locales: Array.from(locales),
  defaultLocale,
} as const;
