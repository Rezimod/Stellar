import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get('stellar_locale')?.value;
  let locale = cookieLocale;
  if (!locale) {
    const accept = (await headers()).get('accept-language')?.toLowerCase() ?? '';
    locale = accept.includes('ka') ? 'ka' : 'en';
  }
  const validLocale = ['en', 'ka'].includes(locale ?? '') ? locale! : 'en';
  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
