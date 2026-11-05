import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  Link as LinkIcon,
  RotateCcw,
  Shield,
  Sparkles,
  UserPlus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Registration() {
  const navigate = useNavigate();
  const { savedPlayerData, session, restoreSession } = useGameStore();
  const { addToast } = useToastStore();
  const [restoring, setRestoring] = useState(false);

  const canRestore =
    Boolean(savedPlayerData && session) && session?.status !== 'ended';

  const handleRestore = () => {
    setRestoring(true);
    const success = restoreSession();
    setRestoring(false);

    if (success) {
      addToast('С возвращением!', 'success');
      navigate('/player');
    } else {
      addToast('Не удалось восстановить сессию.', 'error');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-sm w-full">
        <div className="text-center mb-7">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Битва за капитал</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Присоединяйтесь к сессии и получайте начисления
          </p>
        </div>

        {canRestore && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-5 shadow-2xl border border-blue-500/30 mb-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <RotateCcw size={18} className="text-blue-400" />
              Продолжить участие
            </h2>
            <p className="text-gray-300 text-sm">
              Вы были участником{' '}
              <span className="text-white font-semibold">{savedPlayerData!.name}</span>
            </p>
            <p className="text-gray-400 text-xs mt-1 mb-4">
              Роль: {savedPlayerData!.role === 'buyer' ? '🛒 Покупатель' : '💼 Продавец'} · Сессия{' '}
              {session?.code}
            </p>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              {restoring ? 'Восстанавливаем...' : 'Вернуться на свой экран'}
            </button>
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700 mb-4">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-400" />
            Я участник
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Введите код сессии от организатора и своё имя
          </p>
          <button
            onClick={() => navigate('/join')}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LinkIcon size={18} />
            Присоединиться к сессии
            <ArrowRight size={18} />
          </button>
        </div>

        <button
          onClick={() => navigate('/host')}
          className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 text-gray-200 font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Shield size={18} className="text-emerald-400" />
          Панель организатора
        </button>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link
            to="/money"
            className="bg-gray-800/70 hover:bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 transition-colors"
          >
            <Banknote size={18} className="text-emerald-400" />
            <span className="text-[11px] text-gray-300 text-center leading-tight">
              Деньги
              <br />
              продавцам
            </span>
          </Link>
          <Link
            to="/points"
            className="bg-gray-800/70 hover:bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 transition-colors"
          >
            <Sparkles size={18} className="text-violet-400" />
            <span className="text-[11px] text-gray-300 text-center leading-tight">
              Очки
              <br />
              покупателям
            </span>
          </Link>
        </div>

        <div
          className={`text-center text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 ${
            isSupabaseConfigured
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
          }`}
        >
          {isSupabaseConfigured ? (
            <>
              <Wifi size={14} />
              Сервер подключён — данные синхронизируются между устройствами
            </>
          ) : (
            <>
              <WifiOff size={14} />
              Локальный режим — работает только на этом устройстве
            </>
          )}
        </div>

        <p className="text-center text-gray-600 text-[11px] mt-4">
          Служебные страницы «Деньги» и «Очки» защищены PIN организатора.
        </p>
      </div>
    </div>
  );
}
