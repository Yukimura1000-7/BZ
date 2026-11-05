import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * При старте приложения подтягивает актуальные данные сессии из Supabase.
 * Нужно, например, после перезагрузки страницы участника.
 */
export default function SessionInitializer() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const state = useGameStore.getState();
    if (state.session && isSupabaseConfigured) {
      void state.syncFromSupabase();
    }
  }, []);

  return null;
}
