import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Check,
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Sparkles,
  Square,
  Users,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { shortPlayerId } from '../lib/ids';
import { copyText } from '../lib/clipboard';
import StaffLinks from '../components/StaffLinks';

export default function HostPanel() {
  const { session, staffSessionId } = useGameStore();
  const isStaff = Boolean(session && staffSessionId === session.id);

  if (session && isStaff) {
    return <HostDashboard />;
  }

  return <HostEntry />;
}

function HostEntry() {
  const { session, createSession, authenticateStaff } = useGameStore();
  const { addToast } = useToastStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState(session?.code ?? '');
  const [pin, setPin] = useState('');
  const [creating, setCreating] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.code) setCode((current) => current || session.code);
  }, [session?.code]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;

    setCreating(true);
    setError('');
    try {
      const created = await createSession(name);
      const syncError = useGameStore.getState().syncError;
      addToast(
        syncError
          ? `Сессия создана локально. Код: ${created.code}`
          : `Сессия создана. Код: ${created.code}`,
        syncError ? 'warning' : 'success',
        6000
      );
      setName('');
    } catch (createError) {
      console.error('Create session error:', createError);
      setError('Не удалось создать сессию.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (loggingIn) return;

    setError('');
    if (!code.trim()) {
      setError('Введите код сессии.');
      return;
    }
    if (!pin.trim()) {
      setError('Введите PIN организатора.');
      return;
    }

    setLoggingIn(true);
    const result = await authenticateStaff(code, pin);
    setLoggingIn(false);

    if (!result.ok) {
      setError(result.error || 'Не удалось войти.');
      return;
    }

    setPin('');
    addToast('Вход выполнен.', 'success');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Панель организатора</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Создайте сессию или войдите в существующую
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700 space-y-3 mb-4"
        >
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Plus size={18} className="text-emerald-400" />
            Новая сессия
          </h2>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Название сессии (необязательно)"
            maxLength={80}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Создаём...
              </>
            ) : (
              <>
                <Plus size={18} />
                Создать сессию
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="h-px bg-gray-700 flex-1" />
          <span className="text-gray-500 text-xs uppercase tracking-wider">или</span>
          <div className="h-px bg-gray-700 flex-1" />
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700 space-y-3"
        >
          <h2 className="text-white font-semibold flex items-center gap-2">
            <KeyRound size={18} className="text-blue-400" />
            Войти в сессию
          </h2>
          <input
            type="text"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setError('');
            }}
            placeholder="Код сессии"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-lg font-mono tracking-widest placeholder-gray-500 placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
          />
          <input
            type="password"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value);
              setError('');
            }}
            placeholder="PIN организатора"
            autoComplete="off"
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-xs">
              Сервер не настроен. Сессия будет доступна только на этом устройстве.
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn || !code.trim() || !pin.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loggingIn ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <KeyRound size={18} />
                Войти
              </>
            )}
          </button>
        </form>

        <Link
          to="/"
          className="block text-center text-gray-400 hover:text-white text-sm py-3 mt-2 transition-colors"
        >
          ← На главную
        </Link>
      </div>
    </div>
  );
}

function HostDashboard() {
  const {
    session,
    players,
    endSession,
    resetSession,
    logoutStaff,
    syncFromSupabase,
    syncError,
    lastSyncAt,
  } = useGameStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [ending, setEnding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (session && isSupabaseConfigured) {
      void syncFromSupabase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sortedPlayers;

    return sortedPlayers.filter(
      (player) =>
        player.name.toLowerCase().includes(normalizedQuery) ||
        player.id.toLowerCase().includes(normalizedQuery) ||
        shortPlayerId(player.id).toLowerCase().includes(normalizedQuery)
    );
  }, [sortedPlayers, query]);

  if (!session) return null;

  const isEnded = session.status === 'ended';
  const buyers = players.filter((player) => player.role === 'buyer');
  const sellers = players.filter((player) => player.role === 'seller');

  const joinUrl = `${window.location.href.split('#')[0]}#/join/${session.code}`;

  const handleCopy = async (text: string, label: string) => {
    const success = await copyText(text);
    if (success) {
      setCopied(label);
      addToast(`${label} скопирован.`, 'success');
      setTimeout(() => setCopied(null), 2000);
    } else {
      addToast('Не удалось скопировать.', 'error');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Битва за капитал',
          text: `Присоединяйтесь к сессии. Код: ${session.code}`,
          url: joinUrl,
        });
        return;
      } catch {
        // Пользователь закрыл системное окно — ничего не делаем.
        return;
      }
    }
    await handleCopy(joinUrl, 'Ссылка для участников');
  };

  const handleEnd = async () => {
    if (!window.confirm('Завершить сессию? Участники больше не смогут получать начисления.')) {
      return;
    }

    setEnding(true);
    const success = await endSession();
    setEnding(false);

    if (success) {
      addToast('Сессия завершена.', 'success');
    } else {
      addToast('Не удалось завершить сессию.', 'error');
    }
  };

  const handleNewSession = () => {
    if (
      !window.confirm(
        'Начать новую сессию? Текущая сессия останется в базе, но это устройство переключится на новую.'
      )
    ) {
      return;
    }
    resetSession();
    addToast('Можно создавать новую сессию.', 'info');
  };

  const handleLogout = () => {
    logoutStaff();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-gray-900 pb-10">
      <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
        <StaffLinks active="host" />

        <header className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Shield size={22} className="text-emerald-400" />
              Панель организатора
            </h1>
            <p className="text-gray-400 text-sm mt-0.5 truncate">{session.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl px-2.5 py-2 transition-all flex items-center gap-1.5 flex-shrink-0"
            title="Выйти из панели"
          >
            <LogOut size={14} />
            <span className="text-xs hidden sm:inline">Выход</span>
          </button>
        </header>

        {isEnded && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">
              Сессия завершена. Начисления остановлены.
            </p>
          </div>
        )}

        {syncError && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-sm">{syncError}</p>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-sm">
              Сервер не настроен. Сессия и начисления работают только на этом устройстве.
            </p>
          </div>
        )}

        {/* Session card */}
        <div className="mt-4 bg-gray-800 rounded-2xl border border-gray-700 p-4 sm:p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-xs">Код сессии для участников</p>
              <button
                onClick={() => handleCopy(session.code, 'Код сессии')}
                className="mt-1 flex items-center gap-2 group"
                title="Скопировать код"
              >
                <span
                  data-testid="session-code"
                  className="text-3xl sm:text-4xl font-mono font-black tracking-[0.18em] text-white"
                >
                  {session.code}
                </span>
                {copied === 'Код сессии' ? (
                  <Check size={18} className="text-emerald-400" />
                ) : (
                  <Copy size={18} className="text-gray-500 group-hover:text-gray-300" />
                )}
              </button>
              <p className="text-gray-500 text-[11px] mt-1">
                Участник вводит код на главной странице.
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => handleCopy(joinUrl, 'Ссылка для участников')}
                  className="bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                >
                  {copied === 'Ссылка для участников' ? <Check size={14} /> : <Copy size={14} />}
                  Ссылка
                </button>
                <button
                  onClick={handleShare}
                  className="bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Share2 size={14} />
                  Поделиться
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-2 flex-shrink-0">
              <QRCodeSVG value={joinUrl} size={96} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-700 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-gray-400 text-[11px] flex items-center gap-1">
                <KeyRound size={12} />
                PIN для персонала
              </p>
              <p
                data-testid="staff-pin"
                className="font-mono text-lg font-bold text-amber-300 tracking-widest"
              >
                {session.staffPin || 'admin'}
              </p>
            </div>
            <button
              onClick={() => handleCopy(session.staffPin || 'admin', 'PIN для персонала')}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              {copied === 'PIN для персонала' ? <Check size={14} /> : <Copy size={14} />}
              Копировать PIN
            </button>
          </div>
          <p className="text-gray-500 text-[11px] mt-2">
            На страницах «Деньги» и «Очки» персонал вводит код сессии и этот PIN.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
            <Users size={16} className="text-blue-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{players.length}</p>
            <p className="text-gray-500 text-[10px]">Участники</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
            <Banknote size={16} className="text-emerald-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{sellers.length}</p>
            <p className="text-gray-500 text-[10px]">Продавцы</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
            <Sparkles size={16} className="text-violet-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{buyers.length}</p>
            <p className="text-gray-500 text-[10px]">Покупатели</p>
          </div>
        </div>

        {/* Mechanics */}
        {!isEnded && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              to="/money"
              className="bg-gradient-to-br from-emerald-600 to-emerald-700 border border-emerald-500 rounded-2xl p-4 flex items-center gap-3 hover:from-emerald-500 hover:to-emerald-600 transition-all"
            >
              <div className="bg-white/15 rounded-xl p-2.5">
                <Banknote size={22} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-sm">Деньги продавцам</p>
                <p className="text-emerald-100 text-xs">{sellers.length} продавцов</p>
              </div>
              <ArrowRight size={18} className="text-white/80 flex-shrink-0" />
            </Link>

            <Link
              to="/points"
              className="bg-gradient-to-br from-violet-600 to-purple-700 border border-violet-500 rounded-2xl p-4 flex items-center gap-3 hover:from-violet-500 hover:to-purple-600 transition-all"
            >
              <div className="bg-white/15 rounded-xl p-2.5">
                <Sparkles size={22} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-sm">Очки покупателям</p>
                <p className="text-violet-100 text-xs">{buyers.length} покупателей</p>
              </div>
              <ArrowRight size={18} className="text-white/80 flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* Participants */}
        <section className="mt-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-white font-semibold text-sm sm:text-base">
              Участники · {players.length}
            </h2>
            <button
              onClick={async () => {
                setRefreshing(true);
                await syncFromSupabase();
                setRefreshing(false);
                addToast('Список обновлён.', 'info');
              }}
              disabled={refreshing}
              className="text-gray-400 hover:text-white disabled:text-gray-600 transition-colors flex items-center gap-1 text-xs"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>

          <div className="relative mb-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени или ID"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 text-center">
              <p className="text-gray-400 text-sm">
                {players.length === 0
                  ? 'Пока никто не присоединился. Поделитесь кодом или ссылкой.'
                  : 'Никого не найдено по запросу.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => {
                const isBuyer = player.role === 'buyer';
                return (
                  <div
                    key={player.id}
                    className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] px-2 py-1 rounded-md bg-gray-700 text-gray-300 tracking-wider flex-shrink-0">
                        {shortPlayerId(player.id)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-gray-200 text-sm truncate">{player.name}</p>
                        <span
                          className={`text-[10px] font-bold ${
                            isBuyer ? 'text-blue-400' : 'text-red-400'
                          }`}
                        >
                          {isBuyer ? 'ПОКУПАТЕЛЬ' : 'ПРОДАВЕЦ'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-sm font-bold ${
                          isBuyer ? 'text-violet-300' : 'text-emerald-400'
                        }`}
                      >
                        {isBuyer
                          ? `${player.usefulnessPoints.toLocaleString('ru-RU')} очк.`
                          : `${player.balance.toLocaleString('ru-RU')} ₽`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lastSyncAt && (
            <p className="text-gray-600 text-[11px] mt-2 text-right">
              Обновлено в{' '}
              {new Date(lastSyncAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          )}
        </section>

        <div className="mt-6 space-y-2">
          {!isEnded ? (
            <button
              onClick={handleEnd}
              disabled={ending}
              className="w-full bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {ending ? <Loader2 size={18} className="animate-spin" /> : <Square size={18} />}
              Завершить сессию
            </button>
          ) : (
            <button
              onClick={handleNewSession}
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Создать новую сессию
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
          >
            Выйти из панели
          </button>
        </div>
      </div>
    </div>
  );
}
