import Constants from 'expo-constants';

function readExtra(key: string): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const val = fromExtra[key] ?? process.env[key];
  return typeof val === 'string' ? val : undefined;
}

export const env = {
  privyAppId: readExtra('EXPO_PUBLIC_PRIVY_APP_ID') ?? 'cmnnk6n2c002d0cl47skaaz0d',
  privyClientId: readExtra('EXPO_PUBLIC_PRIVY_CLIENT_ID'),
  supabaseUrl: readExtra('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readExtra('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  webChatEndpoint: readExtra('EXPO_PUBLIC_WEB_CHAT_ENDPOINT') ?? 'https://stellarrclub.vercel.app/api/chat',
};
