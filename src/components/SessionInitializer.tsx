import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export default function SessionInitializer() {
  const { session, currentPlayerId, players, syncFromSupabase } = useGameStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const init = async () => {
      console.log('🚀 SessionInitializer: checking state...', {
        hasSession: !!session,
        currentPlayerId,
        playersCount: players.length,
        isSupabaseConfigured,
      });

      // Проверяем localStorage напрямую
      try {
        const storageKey = 'econom-strategy-storage';
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log('📦 localStorage state:', {
            hasSession: !!parsed?.state?.session,
            currentPlayerId: parsed?.state?.currentPlayerId,
            playersCount: parsed?.state?.players?.length,
          });
        }
      } catch (e) {
        console.error('❌ Error reading localStorage:', e);
      }

      // Если есть currentPlayerId, но нет players — нужно загрузить из Supabase
      if (session && currentPlayerId && players.length === 0 && isSupabaseConfigured) {
        console.log('⚠️ currentPlayerId exists but players is empty — loading from Supabase');
        
        // Ждём немного, чтобы Zustand persist успел загрузить данные из localStorage
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const stateBefore = useGameStore.getState();
        console.log('📊 State after wait: players=', stateBefore.players.length);
        
        // Если всё ещё пусто — загружаем из Supabase
        if (stateBefore.players.length === 0) {
          await syncFromSupabase();
          
          const stateAfter = useGameStore.getState();
          console.log('📥 After sync: players=', stateAfter.players.length);
          
          // Проверяем, что игрок найден
          const player = stateAfter.players.find(p => p.id === currentPlayerId);
          if (!player) {
            console.error('❌ Player not found after sync! currentPlayerId:', currentPlayerId);
            console.error('❌ Available player IDs:', stateAfter.players.map(p => p.id));
          } else {
            console.log('✅ Player found after sync:', player.name);
          }
        } else {
          console.log('✅ Players loaded from localStorage:', stateBefore.players.length);
        }
      }

      setInitialized(true);
    };

    init();
  }, [initialized, session, currentPlayerId, players.length, syncFromSupabase]);

  return null;
}
