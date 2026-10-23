import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export default function TimerEffect() {
  const { timerRunning, tickTimer, session } = useGameStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerRunning, tickTimer]);

  // Предупреждение за 2 минуты до конца
  useEffect(() => {
    if (session && session.timer === 120 && timerRunning) {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [session?.timer, timerRunning]);

  return null;
}
