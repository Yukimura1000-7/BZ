import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Trophy, Clock, Users, Zap, LogOut } from 'lucide-react';
import CurrencyTicker from '../components/CurrencyTicker';

export default function MainScreen() {
  const { players, timerRunning, session, events } = useGameStore();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gray-900">
        <p className="text-gray-400">Сессия не создана</p>
      </div>
    );
  }

  const timer = session.timer;
  const phase = session.phase;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const buyers = [...players].filter(p => p.role === 'buyer').sort((a, b) => b.balance - a.balance);
  const sellers = [...players].filter(p => p.role === 'seller').sort((a, b) => b.balance - a.balance);
  const buyersCount = buyers.length;
  const sellersCount = sellers.length;

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-2">
            💰 ЭкономСтратегия
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 truncate">{session.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-gray-800 active:bg-red-500/20 border border-gray-700 active:border-red-500/50 text-gray-300 active:text-red-400 rounded-xl px-2.5 py-2 transition-all flex items-center gap-1.5 flex-shrink-0"
          title="Выйти"
        >
          <LogOut size={14} />
          <span className="text-xs hidden sm:inline">Выход</span>
        </button>
      </div>

      {/* Session code + stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-3 text-center">
          <p className="text-gray-400 text-[10px] sm:text-xs">Код</p>
          <p className="text-white font-mono font-bold text-base sm:text-xl tracking-wider">{session.code}</p>
        </div>
        <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] sm:text-xs">
            <Users size={10} />
            <span>Всего</span>
          </div>
          <p className="text-white font-bold text-base sm:text-xl">{players.length}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
          <p className="text-blue-400 text-[10px] sm:text-xs">🛒 Покупатели</p>
          <p className="text-blue-400 font-bold text-base sm:text-xl">{buyersCount}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
          <p className="text-red-400 text-[10px] sm:text-xs">💼 Продавцы</p>
          <p className="text-red-400 font-bold text-base sm:text-xl">{sellersCount}</p>
        </div>
      </div>

      {/* Timer */}
      <div className={`rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-center border ${
        timerRunning 
          ? timer <= 120 
            ? 'bg-red-900/30 border-red-700/50' 
            : 'bg-blue-900/20 border-blue-700/50'
          : 'bg-gray-800/50 border-gray-700/50'
      }`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Clock size={18} className={timer <= 120 && timerRunning ? 'text-red-400' : 'text-white'} />
          <span className="text-white text-sm sm:text-lg">Этап {phase}</span>
        </div>
        <div className={`text-5xl sm:text-7xl font-mono font-bold ${
          timerRunning 
            ? timer <= 120 
              ? 'text-red-400 animate-pulse' 
              : 'text-white'
            : 'text-gray-500'
        }`}>
          {formatTime(timer)}
        </div>
        {timerRunning && timer <= 120 && (
          <p className="text-red-400 mt-2 text-xs sm:text-base font-medium animate-pulse">⚠️ Менее 2 минут до конца этапа!</p>
        )}
        {!timerRunning && phase > 0 && (
          <p className="text-gray-500 mt-2 text-xs sm:text-base">Этап завершён</p>
        )}
        {!timerRunning && phase === 0 && (
          <p className="text-gray-500 mt-2 text-xs sm:text-base">Ожидание начала</p>
        )}
      </div>

      {/* Бегущая строка курсов валют */}
      <div className="mb-4 sm:mb-6 -mx-3 sm:-mx-6">
        <CurrencyTicker />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Leaderboard - Buyers */}
        <div className="order-1">
          <div className="bg-gray-800/80 rounded-2xl border border-blue-500/30 p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-blue-400" />
              🛒 Покупатели
              <span className="text-blue-400 text-sm font-normal">({buyersCount})</span>
            </h2>
            {buyers.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-gray-500 text-sm sm:text-lg">Нет покупателей</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {buyers.map((player, index) => {
                  const maxBalance = buyers[0]?.balance || 1;
                  const widthPercent = (player.balance / maxBalance) * 100;
                  
                  return (
                    <div key={player.id} className="relative">
                      <div className="flex items-center gap-2 sm:gap-3 bg-blue-500/5 rounded-xl p-2 sm:p-3 relative z-10">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                          index === 0 ? 'bg-white text-gray-900' :
                          index === 1 ? 'bg-gray-400 text-gray-900' :
                          index === 2 ? 'bg-gray-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-blue-500">
                          {player.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white font-medium text-sm sm:text-base truncate">{player.name}</span>
                            <span className="text-blue-400 font-bold text-sm sm:text-base flex-shrink-0">{player.balance.toLocaleString()} ₽</span>
                          </div>
                          <div className="mt-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                index === 0 ? 'bg-white' :
                                index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-gray-600' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard - Sellers */}
        <div className="order-2">
          <div className="bg-gray-800/80 rounded-2xl border border-red-500/30 p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-red-400" />
              💼 Продавцы
              <span className="text-red-400 text-sm font-normal">({sellersCount})</span>
            </h2>
            {sellers.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-gray-500 text-sm sm:text-lg">Нет продавцов</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {sellers.map((player, index) => {
                  const maxBalance = sellers[0]?.balance || 1;
                  const widthPercent = (player.balance / maxBalance) * 100;
                  
                  return (
                    <div key={player.id} className="relative">
                      <div className="flex items-center gap-2 sm:gap-3 bg-red-500/5 rounded-xl p-2 sm:p-3 relative z-10">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                          index === 0 ? 'bg-white text-gray-900' :
                          index === 1 ? 'bg-gray-400 text-gray-900' :
                          index === 2 ? 'bg-gray-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-red-500">
                          {player.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white font-medium text-sm sm:text-base truncate">{player.name}</span>
                            <span className="text-red-400 font-bold text-sm sm:text-base flex-shrink-0">{player.balance.toLocaleString()} ₽</span>
                          </div>
                          <div className="mt-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                index === 0 ? 'bg-white' :
                                index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-gray-600' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6 order-2">
          {/* Recent Events */}
          <div className="bg-gray-800/80 rounded-2xl border border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Zap size={16} className="text-red-400" />
              События
            </h2>
            {events.length === 0 ? (
              <p className="text-gray-500 text-xs sm:text-sm text-center py-4">Нет событий</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map(e => (
                  <div key={e.id} className="bg-gray-700/30 rounded-lg p-2 sm:p-3 border-l-2 border-red-500">
                    <p className="text-white font-medium text-xs sm:text-sm">{e.title}</p>
                    {e.description && (
                      <p className="text-gray-400 text-[10px] sm:text-xs mt-1">{e.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
