import { getRequestConfig } from 'next-intl/server';
import messages from '../messages/voyage.en.json';

export default getRequestConfig(async () => ({ locale: 'en', messages }));
