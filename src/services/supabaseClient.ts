import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const PLACEHOLDER_URLS = [
  '',
  'https://tu-proyecto-id.supabase.co',
  'YOUR_SUPABASE_URL',
  'MY_SUPABASE_URL',
];

const PLACEHOLDER_KEYS = [
  '',
  'tu_clave_anon_publica_de_supabase',
  'YOUR_SUPABASE_ANON_KEY',
  'MY_SUPABASE_ANON_KEY',
];

export function isSupabaseConfigured(): boolean {
  if (PLACEHOLDER_URLS.includes(rawUrl) || PLACEHOLDER_KEYS.includes(rawAnonKey)) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const supabaseConfigStatus = {
  isConfigured: isSupabaseConfigured(),
  hasUrl: !PLACEHOLDER_URLS.includes(rawUrl),
  hasAnonKey: !PLACEHOLDER_KEYS.includes(rawAnonKey),
};

// Instanciamos el cliente solo con URL válida para evitar que createClient lance excepción en el arranque
export const supabase: SupabaseClient = createClient(
  supabaseConfigStatus.isConfigured ? rawUrl : 'https://placeholder-unconfigured.supabase.co',
  supabaseConfigStatus.isConfigured ? rawAnonKey : 'public-anon-placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'control_gastos_supabase_auth',
    },
  }
);
