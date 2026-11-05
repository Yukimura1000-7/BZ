import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { shortPlayerId } from '../lib/ids';
import { copyText } from '../lib/clipboard';

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const {
    players,
    currentPlayerId,
    savedPlayerData,
    session,
    leaveSession,
    syncFromSupabase,
    syncError,
    lastSyncAt,
  } = useGameStore();
  const { addToast } = useToastStore();

  const player =
    players.find((candidate) => candidate.id === currentPlayerId) ||
    (savedPlayerData && savedPlayerData.id === currentPlayerId ? savedPlayerData : null);

  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const previousValue = useRef<number | null>(null);

  useEffect(() => {
    if (!player && currentPlayerId && session && isSupabaseConfigured) {
      setSyncing(true);
      void syncFromSupabase().finally(() => setSyncing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerId, Boolean(player), session?.id]);

  const isBuyer = player?.role === 'buyer';
  const currentValue = player ? (isBuyer ? player.usefulnessPoints : player.balance) : 0;

  useEffect(() => {
    if (!player) return;

    if (previousValue.current !== null && currentValue > previousValue.current) {
      const added = currentValue - previousValue.current;
      addToast(
        isBuyer
          ? `+${added} очков полезности зачислено!`
          : `+${added} ₽ зачислено!`,
        'success'
      );
    }

    previousValue.current = currentValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id, player?.balance, player?.usefulnessPoints, player?.role]);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyText(text);
    if (success) {
      setCopied(label);
      addToast(`${label} скопирован.`, 'success');
      setTimeout(() => setCopied(null), 2000);
    } else {
      addToast('Не удалось скопировать. Выделите ID вручную.', 'error');
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    await syncFromSupabase();
    setSyncing(false);
    addToast('Данные обновлены.', 'info');
  };

  const handleLogout = () => {
    leaveSession();
    navigate('/');
  };

  if (!session || !currentPlayerId) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gray-900">
        <div className="max-w-sm w-full bg-gray-800 rounded-2xl p-6 border border-gray-700 text-center">
          <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={26} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Нет активной сессии</h1>
          <p className="text-gray-400 text-sm mb-5">
            Чтобы получить ID и начисления, присоединитесь к сессии.
          </p>
          <Link
            to="/join"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Присоединиться к сессии
          </Link>
          <Link
            to="/"
            className="block w-full mt-2 text-gray-400 hover:text-white text-sm py-2 transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gray-900">
        <div className="max-w-sm w-full bg-gray-800 rounded-2xl p-6 border border-gray-700 text-center">
          {syncing ? (
            <>
              <Loader2 size={28} className="text-blue-400 animate-spin mx-auto mb-3" />
              <h1 className="text-xl font-bold text-white mb-2">Загружаем данные</h1>
              <p className="text-gray-400 text-sm">Получаем информацию об участнике...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Участник не найден</h1>
              <p className="text-gray-400 text-sm mb-5">
                {syncError || 'Возможно, сессия была пересоздана. Попробуйте обновить данные.'}
              </p>
              <button
                onClick={handleRefresh}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 mb-2"
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                Обновить данные
              </button>
              <Link
                to="/join"
                className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-all"
              >
                Присоединиться заново
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const shortId = shortPlayerId(player.id);

  return (
    <div className="min-h-[100dvh] pb-8 bg-gray-900">
      <div
        className={`px-4 pt-8 pb-10 sm:px-6 sm:pt-10 ${
          isBuyer
            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
            : 'bg-gradient-to-r from-red-600 to-red-700'
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-xl mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-white/80 text-xs sm:text-sm">Здравствуйте,</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{player.name}</h1>
            <div
              data-testid="player-role"
              className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-white/20 text-white border border-white/30"
            >
              {isBuyer ? '🛒 ПОКУПАТЕЛЬ' : '💼 ПРОДАВЕЦ'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur rounded-xl p-2.5 transition-all"
            title="Выйти из сессии"
          >
            <LogOut size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-5 sm:px-6">
        <div className="max-w-xl mx-auto space-y-4">
          {session.status === 'ended' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">
                Сессия завершена. Начисления больше не производятся.
              </p>
            </div>
          )}

          {/* ID участника */}
          <div className="bg-amber-400 text-gray-900 rounded-2xl p-5 shadow-xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-900/70">
              Ваш ID для начислений
            </p>
            <p
              data-testid="player-short-id"
              className="mt-1.5 text-3xl sm:text-5xl font-mono font-black tracking-[0.16em] leading-none"
            >
              {shortId}
            </p>

            <button
              onClick={() => handleCopy(shortId, 'Короткий ID')}
              className="mt-3 inline-flex items-center gap-1.5 bg-amber-900/15 hover:bg-amber-900/25 active:bg-amber-900/30 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {copied === 'Короткий ID' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'Короткий ID' ? 'Скопировано' : 'Копировать ID'}
            </button>

            <div className="mt-4 pt-3 border-t border-amber-900/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-900/60">
                Полный ID
              </p>
              <p
                data-testid="player-full-id"
                className="mt-1 font-mono text-[10px] leading-relaxed break-all text-amber-900/80"
              >
                {player.id}
              </p>
              <button
                onClick={() => handleCopy(player.id, 'Полный ID')}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900/70 hover:text-amber-900 transition-colors"
              >
                {copied === 'Полный ID' ? <Check size={12} /> : <Copy size={12} />}
                Скопировать полный ID
              </button>
            </div>
          </div>

          {/* Начисление */}
          <div
            className={`rounded-2xl p-5 shadow-lg border ${
              isBuyer
                ? 'bg-gradient-to-br from-violet-600 to-purple-700 border-violet-500'
                : 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {isBuyer ? (
                <Sparkles size={18} className="text-white" />
              ) : (
                <Wallet size={18} className="text-white" />
              )}
              <span className="text-white/85 text-xs sm:text-sm font-medium">
                {isBuyer ? 'Очки полезности' : 'Ваш капитал'}
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white">
              {currentValue.toLocaleString('ru-RU')}{' '}
              <span className="text-sm font-medium text-white/70">{isBuyer ? 'очк.' : '₽'}</span>
            </p>
            <p className="text-white/70 text-xs mt-2">
              {isBuyer
                ? 'Сотрудник начислит очки по вашему ID.'
                : 'Сотрудник начислит деньги по вашему ID.'}
            </p>
          </div>

          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
            <p className="text-gray-300 text-sm font-medium mb-1.5">
              Покажите этот ID сотруднику
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Назовите короткий код{' '}
              <span className="font-mono font-bold text-amber-300 tracking-wider">{shortId}</span>{' '}
              или покажите экран. Начисления приходят автоматически — обновлять страницу не нужно.
            </p>
          </div>

          {syncError && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">{syncError}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-[11px] text-gray-600 px-1">
            <span>Сессия {session.code}</span>
            <span className="flex items-center gap-1">
              {lastSyncAt
                ? `Обновлено в ${new Date(lastSyncAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}`
                : 'Ожидание синхронизации'}
              <button
                onClick={handleRefresh}
                disabled={syncing}
                className="text-gray-500 hover:text-gray-300 disabled:text-gray-700 transition-colors"
                title="Обновить"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
