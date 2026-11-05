import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useGameStore, type Player } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { shortPlayerId } from '../lib/ids';

const numberFormat = new Intl.NumberFormat('ru-RU');

function rankBadge(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return String(index + 1);
}

interface LeaderboardCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  headerClass: string;
  valueClass: string;
  players: Player[];
  valueOf: (player: Player) => number;
  unit: string;
  emptyText: string;
  currentPlayerId: string | null;
}

function LeaderboardCard({
  title,
  subtitle,
  icon: Icon,
  headerClass,
  valueClass,
  players,
  valueOf,
  unit,
  emptyText,
  currentPlayerId,
}: LeaderboardCardProps) {
  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        const diff = valueOf(b) - valueOf(a);
        return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ru');
      }),
    [players, valueOf]
  );

  return (
    <section className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
      <div className={`bg-gradient-to-r ${headerClass} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-white flex-shrink-0" />
          <h2 className="text-white font-bold">{title}</h2>
          <span className="ml-auto text-white/70 text-xs font-medium">{players.length}</span>
        </div>
        <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>
      </div>

      {sorted.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500 text-sm">{emptyText}</p>
        </div>
      ) : (
        <ol>
          {sorted.map((player, index) => {
            const isCurrent = player.id === currentPlayerId;
            const isTopThree = index < 3;

            return (
              <li
                key={player.id}
                className={`flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-gray-700/60 last:border-b-0 ${
                  isCurrent ? 'bg-blue-500/10' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isTopThree
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-700/50 text-gray-400 text-xs'
                  }`}
                >
                  {rankBadge(index)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-100 font-medium truncate flex items-center gap-1.5">
                    <span className="truncate">{player.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
                        ВЫ
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[10px] text-gray-500 tracking-wider mt-0.5">
                    {shortPlayerId(player.id)}
                  </p>
                </div>

                <p className={`text-sm sm:text-base font-bold flex-shrink-0 ${valueClass}`}>
                  {numberFormat.format(valueOf(player))}{' '}
                  <span className="text-[10px] font-normal text-gray-500">{unit}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default function LeaderboardPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    session,
    players,
    currentPlayerId,
    loadSessionByCode,
    syncFromSupabase,
    lastSyncAt,
    syncError,
  } = useGameStore();
  const { addToast } = useToastStore();

  const requestedCode = code?.trim().toUpperCase() ?? '';
  const [codeInput, setCodeInput] = useState(requestedCode || session?.code || '');
  const [loading, setLoading] = useState(Boolean(requestedCode));
  const [refreshing, setRefreshing] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const target = code?.trim().toUpperCase();
    if (!target) {
      if (session && isSupabaseConfigured) void syncFromSupabase();
      return;
    }

    setCodeInput(target);
    if (session?.code === target) {
      if (isSupabaseConfigured) void syncFromSupabase();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    void loadSessionByCode(target)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          setError('Сессия не найдена. Проверьте код.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const sessionMatches = !requestedCode || session?.code === requestedCode;
  const displaySession = sessionMatches ? session : null;
  const showForm = !displaySession || showCodeForm;

  const buyers = useMemo(
    () => players.filter((player) => player.role === 'buyer'),
    [players]
  );
  const sellers = useMemo(
    () => players.filter((player) => player.role === 'seller'),
    [players]
  );

  const handleLoad = async (event: FormEvent) => {
    event.preventDefault();
    const target = codeInput.trim().toUpperCase();

    if (!target) {
      setError('Введите код сессии.');
      return;
    }

    setLoading(true);
    setError('');
    const loaded = await loadSessionByCode(target);
    setLoading(false);

    if (!loaded) {
      setError('Сессия не найдена. Проверьте код.');
      return;
    }

    setCodeInput(loaded.code);
    setShowCodeForm(false);
    navigate(`/leaderboard/${loaded.code}`, { replace: true });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncFromSupabase();
    setRefreshing(false);
    addToast('Лидерборд обновлён.', 'info');
  };

  return (
    <div className="min-h-[100dvh] bg-gray-900 pb-10">
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
              <Trophy size={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white leading-tight">Лидерборд</h1>
              <p className="text-gray-400 text-sm truncate">
                {displaySession ? displaySession.name : 'Выберите сессию'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/"
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl p-2.5 transition-colors"
              title="На главную"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>
        </header>

        {displaySession && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">Сессия:</span>
            <span className="text-gray-200 font-medium truncate max-w-[60%]">
              {displaySession.name}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-gray-300 tracking-widest">
              {displaySession.code}
            </span>
            {displaySession.status === 'ended' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 font-bold">
                ЗАВЕРШЕНА
              </span>
            )}
            <button
              onClick={() => setShowCodeForm(true)}
              className="text-gray-500 hover:text-gray-300 text-xs underline underline-offset-2 transition-colors ml-auto"
            >
              Другая сессия
            </button>
          </div>
        )}

        {showForm ? (
          <form
            onSubmit={handleLoad}
            className="mt-5 bg-gray-800 rounded-2xl border border-gray-700 p-5 shadow-xl max-w-md"
          >
            <h2 className="text-white font-semibold mb-1">Введите код сессии</h2>
            <p className="text-gray-400 text-sm mb-4">
              Лидерборд открывается без PIN — достаточно кода сессии.
            </p>
            <input
              type="text"
              value={codeInput}
              onChange={(event) => {
                setCodeInput(event.target.value.toUpperCase());
                setError('');
              }}
              placeholder="ABC123"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all uppercase"
            />

            {error && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !codeInput.trim()}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-gray-600 disabled:text-gray-400 text-gray-900 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Загружаем...
                </>
              ) : (
                <>
                  <Trophy size={18} />
                  Показать лидерборд
                </>
              )}
            </button>

            {displaySession && (
              <button
                type="button"
                onClick={() => setShowCodeForm(false)}
                className="mt-2 w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
              >
                Отмена
              </button>
            )}
          </form>
        ) : (
          <>
            {!isSupabaseConfigured && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-sm">
                  Сервер не настроен: лидерборд показывает только данные этого устройства.
                </p>
              </div>
            )}

            {syncError && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{syncError}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-gray-500 text-xs">
                Покупатели — по очкам полезности, продавцы — по деньгам
              </p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-gray-400 hover:text-white disabled:text-gray-600 transition-colors flex items-center gap-1 text-xs flex-shrink-0"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Обновить
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LeaderboardCard
                title="Покупатели"
                subtitle="Очки полезности"
                icon={ShoppingCart}
                headerClass="from-blue-600 to-violet-600"
                valueClass="text-violet-300"
                players={buyers}
                valueOf={(player) => player.usefulnessPoints}
                unit="очк."
                emptyText="Пока нет покупателей в этой сессии."
                currentPlayerId={currentPlayerId}
              />

              <LeaderboardCard
                title="Продавцы"
                subtitle="Деньги / капитал"
                icon={Banknote}
                headerClass="from-emerald-600 to-teal-600"
                valueClass="text-emerald-400"
                players={sellers}
                valueOf={(player) => player.balance}
                unit="₽"
                emptyText="Пока нет продавцов в этой сессии."
                currentPlayerId={currentPlayerId}
              />
            </div>

            {lastSyncAt && (
              <p className="text-gray-600 text-[11px] mt-3 text-right">
                Обновлено в{' '}
                {new Date(lastSyncAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            )}
          </>
        )}

        {loading && !showForm && (
          <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Загружаем данные сессии...
          </div>
        )}
      </div>
    </div>
  );
}
