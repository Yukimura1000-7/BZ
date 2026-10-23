import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export default function StorageSync() {
  const { session, players, deals, events, currencyRates, isAuthenticated, currentPlayerId } = useGameStore();

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== 'econom-strategy-storage') return;
      
      // Перезагружаем страницу при изменениях из другой вкладки
      // Это простой способ синхронизации без WebSocket
      window.location.reload();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return null;
}
