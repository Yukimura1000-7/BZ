import { useNavigate } from 'react-router-dom';
import { UserPlus, Lock, Link as LinkIcon, RotateCcw, HelpCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { useState } from 'react';

export default function Registration() {
  const navigate = useNavigate();
  const { savedPlayerData, session, restoreSession, isSupabaseConnected } = useGameStore();
  const { addToast } = useToastStore();
  const [showHelp, setShowHelp] = useState(false);

  const handleRestoreSession = () => {
    const success = restoreSession();
    if (success) {
      addToast('Сессия восстановлена!', 'success');
      navigate('/player');
    } else {
      addToast('Не удалось восстановить сессию', 'error');
    }
  };

  const canRestore = savedPlayerData && session && session.status !== 'ended';

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Битва за капитал</h1>
          <p className="text-gray-400 mt-2">Экономическая стратегия в реальном времени</p>
        </div>

        {/* Restore session */}
        {canRestore && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-5 shadow-2xl border border-blue-500/30 mb-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <RotateCcw size={18} className="text-blue-400" />
              Восстановить сессию
            </h2>
            <p className="text-gray-300 text-sm mb-3">
              Вы были игроком <span className="text-white font-semibold">{savedPlayerData!.name}</span>
            </p>
            <p className="text-gray-400 text-xs mb-4">
              Роль: {savedPlayerData!.role === 'buyer' ? '🛒 Покупатель' : '💼 Продавец'} • Баланс: {savedPlayerData!.balance} ₽
            </p>
            <button
              onClick={handleRestoreSession}
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Продолжить игру
            </button>
          </div>
        )}

        {/* Join session */}
        <div className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700 mb-4">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-400" />
            Присоединиться к игре
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Введите код сессии от организатора
          </p>
          <button
            onClick={() => navigate('/join')}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LinkIcon size={18} />
            Ввести код сессии
          </button>
        </div>

        {/* Admin login */}
        <button
          onClick={() => navigate('/admin-login')}
          className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 text-gray-300 font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Lock size={16} className="text-white" />
          Вход для администратора
        </button>

        {/* Help toggle */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors flex items-center justify-center gap-1 mb-4"
        >
          <HelpCircle size={14} />
          {showHelp ? 'Скрыть справку' : 'Не получается подключиться?'}
        </button>

        {/* Help section */}
        {showHelp && (
          <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 mb-4 animate-fade-in">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <HelpCircle size={14} className="text-blue-400" />
              Частые проблемы
            </h3>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-yellow-400 font-medium mb-1">❌ «Сессия не найдена»</p>
                <p className="text-gray-400 text-xs">
                  {!isSupabaseConnected 
                    ? 'Сервер синхронизации не подключён. Сессия должна быть создана на ЭТОМ устройстве. Попросите администратора открыть эту страницу на вашем устройстве и создать сессию.'
                    : 'Сессия с таким кодом не существует. Убедитесь, что код введён правильно (без пробелов), и что сессия ещё не завершена.'}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-blue-400 font-medium mb-1">💡 Как создать сессию?</p>
                <p className="text-gray-400 text-xs">
                  Администратор нажимает «Вход для администратора» → создаёт сессию → сообщает вам 6-значный код.
                </p>
              </div>
              {!isSupabaseConnected && (
                <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                  <p className="text-amber-400 font-medium mb-1">⚠️ Локальный режим</p>
                  <p className="text-gray-400 text-xs">
                    Приложение работает без сервера. Все участники должны использовать одно устройство или настроить Supabase для работы между устройствами.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Supabase status indicator */}
        <div className={`text-center text-xs px-3 py-2 rounded-lg ${
          isSupabaseConnected 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
        }`}>
          {isSupabaseConnected 
            ? '✅ Сервер подключён — синхронизация между устройствами активна' 
            : '⚠️ Локальный режим — работает только на этом устройстве. Для мультидевайс режима настройте Supabase.'}
        </div>
      </div>
    </div>
  );
}
