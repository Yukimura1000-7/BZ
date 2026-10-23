import { useGameStore } from '../store/gameStore';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function CurrencyTicker() {
  const { currencyRates } = useGameStore();

  if (currencyRates.length === 0) return null;

  // Дублируем контент 4 раза для бесшовной анимации
  const rates = [...currencyRates, ...currencyRates, ...currencyRates, ...currencyRates];

  return (
    <div className="w-full bg-gray-900 border-y border-gray-700 overflow-hidden">
      <div className="ticker-track py-3 whitespace-nowrap">
        {rates.map((rate, index) => (
          <div
            key={`${rate.currency}-${index}`}
            className="inline-flex items-center gap-2 px-6"
          >
            <span className="text-white font-bold text-sm">{rate.currency}</span>
            <span className="text-gray-300 text-sm">{rate.rate.toLocaleString()} ₽</span>
            {rate.change !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                rate.change >= 0 ? 'text-blue-400' : 'text-red-400'
              }`}>
                {rate.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {rate.change >= 0 ? '+' : ''}{rate.change.toFixed(2)}%
              </span>
            )}
            <span className="text-gray-600 ml-4 text-lg">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
