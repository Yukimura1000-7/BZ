import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';

export default function SupabaseRealtime() {
  const { session, syncFromSupabase, isSupabaseConnected, checkSupabaseConnection } = useGameStore();

  // Проверяем подключение при старте
  useEffect(() => {
    checkSupabaseConnection();
  }, [checkSupabaseConnection]);

  // Подписываемся на изменения в сессии
  useEffect(() => {
    if (!session || !isSupabaseConnected) return;

    // Подписка на изменения сессии
    const sessionChannel = supabase
      .channel(`session-changes-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${session.id}`,
      }, () => {
        syncFromSupabase();
      })
      .subscribe();

    // Подписка на изменения игроков
    const playersChannel = supabase
      .channel(`players-changes-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${session.id}`,
      }, () => {
        syncFromSupabase();
      })
      .subscribe();

    // Подписка на изменения сделок
    const dealsChannel = supabase
      .channel(`deals-changes-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deals',
        filter: `session_id=eq.${session.id}`,
      }, () => {
        syncFromSupabase();
      })
      .subscribe();

    // Подписка на изменения событий
    const eventsChannel = supabase
      .channel(`events-changes-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `session_id=eq.${session.id}`,
      }, () => {
        syncFromSupabase();
      })
      .subscribe();

    // Подписка на изменения курсов валют
    const ratesChannel = supabase
      .channel(`rates-changes-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'currency_rates',
        filter: `session_id=eq.${session.id}`,
      }, () => {
        syncFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(dealsChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(ratesChannel);
    };
  }, [session?.id, isSupabaseConnected, syncFromSupabase]);

  // Периодическая синхронизация (fallback если realtime не работает)
  useEffect(() => {
    if (!session || !isSupabaseConnected) return;

    const interval = setInterval(() => {
      syncFromSupabase();
    }, 5000);

    return () => clearInterval(interval);
  }, [session?.id, isSupabaseConnected, syncFromSupabase]);

  return null;
}
