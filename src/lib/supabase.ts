import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Безопасное получение переменных окружения
const getEnvVar = (key: string): string => {
  try {
    return (import.meta as any).env?.[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Проверяем что переменные заданы и валидны
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 20 &&
  !supabaseUrl.includes('YOUR_SUPABASE') &&
  !supabaseAnonKey.includes('YOUR_SUPABASE')
);

// Создаем клиент только если переменные заданы
let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    console.log('✅ Supabase подключен:', supabaseUrl);
  } catch (e) {
    console.error('❌ Ошибка инициализации Supabase:', e);
  }
} else {
  console.warn('⚠️ Supabase не настроен. Приложение работает в локальном режиме.');
}

export const getSupabase = (): SupabaseClient | null => client;
