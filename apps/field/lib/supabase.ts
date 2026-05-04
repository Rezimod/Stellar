import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = env.supabaseUrl && env.supabaseAnonKey
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export type Observation = {
  id: string;
  user_id: string;
  target: string;
  notes: string;
  recorded_at: string;
  source: 'voice' | 'text';
  on_chain_signature?: string | null;
};

export async function saveObservation(payload: Omit<Observation, 'id' | 'recorded_at'>) {
  if (!supabase) throw new Error('Supabase not configured — set EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY');
  const { data, error } = await supabase
    .from('observations')
    .insert({ ...payload, recorded_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as Observation;
}
