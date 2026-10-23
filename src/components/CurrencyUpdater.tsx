import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export default function CurrencyUpdater() {
  const { currencyRates, updateCurrencyRate, timerRunning } = useGameStore();

  useEffect(() => {
    if (!timerRunning) return;

    // Обновляем курсы валют каждые 10 секунд
    const interval = setInterval(() => {
      currencyRates.forEach(currency => {
        // Случайное изменение от -2% до +2%
        const changePercent = (Math.random() - 0.5) * 4;
        const newRate = currency.rate * (1 + changePercent / 100);
        
        // Округляем до разумных значений
        const roundedRate = currency.rate > 1000 
          ? Math.round(newRate)
          : Math.round(newRate * 100) / 100;
        
        updateCurrencyRate(currency.currency, roundedRate);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [timerRunning, currencyRates, updateCurrencyRate]);

  return null;
}
