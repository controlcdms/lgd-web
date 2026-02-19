const {getRequestConfig} = require('next-intl/server');

const locales = ['en', 'es'];
const defaultLocale = 'en';

module.exports = getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;
  if (!locales.includes(locale)) locale = defaultLocale;

  // JSON files are supported by Node/Next bundler
  const messages = require(`../messages/${locale}.json`);
  return {locale, messages};
});
