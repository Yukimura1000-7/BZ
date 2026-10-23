import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export default function SupabaseRealtime() {
  const { session, syncFromSupabase } = useGameStore();

  // Подписываемся на изменения в сессии
  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;
    const client = getSupabase();
    if (!client) return;

    const channels = [
      'sessions',
      'players',
      'deals',
      'events',
      'currency_rates',
    ].map(table => {
      const filterCol = table === 'sessions' ? 'id' : 'session_id';
      return client
        .channel(`${table}-${session.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table,
          filter: `${filterCol}=eq.${session.id}`,
        }, () => {
          syncFromSupabase();
        })
        .subscribe();
    });

    return () => {
      channels.forEach(ch => client.removeChannel(ch));
    };
  }, [session?.id, syncFromSupabase]);

  // Периодическая синхронизация (fallback)
  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;

    const interval = setInterval(() => {
      syncFromSupabase();
    }, 5000);

    return () => clearInterval(interval);
  }, [session?.id, syncFromSupabase]);

  return null;
}
