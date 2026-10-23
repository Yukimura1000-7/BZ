import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { QRCodeSVG } from 'qrcode.react';
import { Wallet, Package, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, LogOut } from 'lucide-react';
import CurrencyTicker from '../components/CurrencyTicker';

export default function PlayerDashboard() {
  const { players, currentPlayerId, deals, timerRunning, session, setCurrentPlayer } = useGameStore();
  const player = players.find(p => p.id === currentPlayerId);
  const navigate = useNavigate();

  if (!player || !session) return null;

  const timer = session.timer;
  const phase = session.phase;
  const phaseDuration = session.phaseDuration || 600;
  const isBuyer = player.role === 'buyer';

  const playerDeals = deals
    .filter(d => d.sellerId === player.id || d.buyerId === player.id)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  const totalGoods = Object.values(player.goods).reduce((a, b) => a + b, 0);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    setCurrentPlayer('');
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] pb-24 bg-gray-900">
      {/* Header */}
      <div className={`px-4 pt-10 pb-10 sm:px-6 sm:pt-12 sm:pb-14 ${
        isBuyer 
          ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
          : 'bg-gradient-to-r from-red-600 to-red-700'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-white/80 text-xs sm:text-sm">Привет,</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{player.name}</h1>
            <div className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-white/20 text-white border border-white/30`}>
              {isBuyer ? '🛒 ПОКУПАТЕЛЬ' : '💼 ПРОДАВЕЦ'}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-white/20 backdrop-blur rounded-xl p-1.5 sm:p-2">
              <QRCodeSVG value={player.qrCode} size={44} />
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur rounded-xl p-2 transition-all"
              title="Выйти из игры"
            >
              <LogOut size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 -mt-5 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700 shadow-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet size={14} className="text-blue-400" />
              <span className="text-gray-400 text-xs">Баланс</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{player.balance} <span className="text-xs sm:text-sm text-gray-400">₽</span></p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700 shadow-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Package size={14} className="text-blue-400" />
              <span className="text-gray-400 text-xs">Товары</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{totalGoods} <span className="text-xs sm:text-sm text-gray-400">шт</span></p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700 shadow-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={14} className="text-white" />
              <span className="text-gray-400 text-xs">Сделки</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{playerDeals.filter(d => d.status === 'confirmed').length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700 shadow-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock size={14} className="text-white" />
              <span className="text-gray-400 text-xs">Этап</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{phase}</p>
          </div>
        </div>
      </div>

      {/* Бегущая строка курсов валют */}
      <div className="mt-3 -mx-4 sm:-mx-6">
        <CurrencyTicker />
      </div>

      {/* Timer */}
      {timerRunning && (
        <div className="px-4 mt-3 sm:px-6">
          <div className={`rounded-xl p-3 sm:p-4 border ${timer <= 120 ? 'bg-red-900/30 border-red-700' : 'bg-gray-800 border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs sm:text-sm">Осталось времени</span>
              <span className={`font-mono text-xl sm:text-2xl font-bold ${timer <= 120 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {formatTime(timer)}
              </span>
            </div>
            <div className="mt-2 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${timer <= 120 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${(timer / phaseDuration) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Goods */}
      <div className="px-4 mt-5 sm:px-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-2">📦 Ваши товары</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {Object.entries(player.goods).map(([good, qty]) => (
            <div key={good} className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-700 last:border-b-0">
              <span className="text-gray-300 text-sm sm:text-base">{good}</span>
              <span className={`font-bold text-sm sm:text-base ${qty > 0 ? 'text-white' : 'text-gray-500'}`}>{qty}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 mt-5 mb-4 sm:px-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-2">📋 История сделок</h2>
        {playerDeals.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center">
            <p className="text-gray-500">Пока нет сделок</p>
            <p className="text-gray-600 text-sm mt-1">Совершите первую сделку!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {playerDeals.map(deal => {
              const isSeller = deal.sellerId === player.id;
              const otherPlayer = players.find(p => p.id === (isSeller ? deal.buyerId : deal.sellerId));
              return (
                <div key={deal.id} className="bg-gray-800 rounded-xl border border-gray-700 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isSeller ? (
                        <ArrowUpRight size={16} className="text-red-400 flex-shrink-0" />
                      ) : (
                        <ArrowDownRight size={16} className="text-blue-400 flex-shrink-0" />
                      )}
                      <span className="text-gray-300 text-xs sm:text-sm truncate">
                        {isSeller ? 'Продажа' : 'Покупка'}: {deal.goods} ×{deal.quantity}
                      </span>
                    </div>
                    <span className={`font-bold text-sm sm:text-base flex-shrink-0 ${isSeller ? 'text-red-400' : 'text-blue-400'}`}>
                      {isSeller ? '+' : '-'}{deal.amount} ₽
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-500 text-xs truncate">
                      {otherPlayer?.name || 'Неизвестный'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      deal.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      deal.status === 'pending' ? 'bg-white/10 text-white' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {deal.status === 'confirmed' ? '✓ Подтверждена' : deal.status === 'pending' ? '⏳ Ожидание' : '✗ Отклонена'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
