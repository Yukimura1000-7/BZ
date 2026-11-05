import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Держит список участников и статус сессии в актуальном состоянии
 * на всех устройствах: realtime-подписка + периодическая синхронизация.
 */
export default function SupabaseRealtime() {
  const sessionId = useGameStore((state) => state.session?.id ?? null);
  const syncFromSupabase = useGameStore((state) => state.syncFromSupabase);

  useEffect(() => {
    if (!sessionId || !isSupabaseConfigured) return;

    const client = getSupabase();
    if (!client) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void syncFromSupabase();
      }, 250);
    };

    const channel = client
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${sessionId}`,
        },
        scheduleSync
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        scheduleSync
      )
      .subscribe();

    // Резервный опрос — если realtime выключен в проекте Supabase.
    const poll = setInterval(() => {
      void syncFromSupabase();
    }, 4000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [sessionId, syncFromSupabase]);

  return null;
}
