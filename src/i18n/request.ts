import { getRequestConfig } from 'next-intl/server';
import en from '../messages/en.json';

// Sidera v1 is English-only. The Georgian file is archived in docs/archive/ka.json.
export default getRequestConfig(async () => ({
  locale: 'en',
  messages: en,
}));
