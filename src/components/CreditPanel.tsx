import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useGameStore, type CreditKind, type Player } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { normalizeIdInput, playerIdMatches, shortPlayerId } from '../lib/ids';
import StaffLinks from './StaffLinks';

interface CreditPanelProps {
  kind: CreditKind;
}

interface CreditLogEntry {
  id: string;
  name: string;
  shortId: string;
  amount: number;
  at: number;
}

const numberFormat = new Intl.NumberFormat('ru-RU');

const configs = {
  money: {
    title: 'Деньги продавцам',
    subtitle: 'Начисление капитала продавцам',
    role: 'seller' as const,
    roleLabel: 'продавец',
    rolePlural: 'Продавцы',
    valueLabel: 'Баланс',
    unit: '₽',
    presets: [100, 200, 500, 1000],
    icon: Banknote,
    otherPath: '/points',
    otherTitle: 'Очки покупателям',
    wrongRoleHint:
      'Это покупатель. Деньги начисляются продавцам — откройте страницу «Очки покупателям».',
    tone: {
      iconBox: 'bg-emerald-500/15 border border-emerald-500/30',
      icon: 'text-emerald-400',
      button: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
      panel: 'bg-emerald-500/10 border-emerald-500/30',
      value: 'text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      focus: 'focus:border-emerald-500 focus:ring-emerald-500',
    },
  },
  points: {
    title: 'Очки покупателям',
    subtitle: 'Начисление очков полезности покупателям',
    role: 'buyer' as const,
    roleLabel: 'покупатель',
    rolePlural: 'Покупатели',
    valueLabel: 'Очки полезности',
    unit: 'очк.',
    presets: [10, 25, 50, 100],
    icon: Sparkles,
    otherPath: '/money',
    otherTitle: 'Деньги продавцам',
    wrongRoleHint:
      'Это продавец. Очки начисляются покупателям — откройте страницу «Деньги продавцам».',
    tone: {
      iconBox: 'bg-violet-500/15 border border-violet-500/30',
      icon: 'text-violet-400',
      button: 'bg-violet-500 hover:bg-violet-600 active:bg-violet-700',
      panel: 'bg-violet-500/10 border-violet-500/30',
      value: 'text-violet-300',
      badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
      focus: 'focus:border-violet-500 focus:ring-violet-500',
    },
  },
};

export default function CreditPanel({ kind }: CreditPanelProps) {
  const config = configs[kind];
  const Icon = config.icon;

  const { players, session, creditPlayer, syncFromSupabase, syncError, lastSyncAt } =
    useGameStore();
  const { addToast } = useToastStore();

  const [input, setInput] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<CreditLogEntry & { newValue: number } | null>(null);
  const [log, setLog] = useState<CreditLogEntry[]>([]);

  useEffect(() => {
    if (session && isSupabaseConfigured) {
      void syncFromSupabase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const rolePlayers = useMemo(
    () => players.filter((player) => player.role === config.role),
    [players, config.role]
  );

  const normalizedLength = normalizeIdInput(input).length;
  const matches = useMemo(
    () => (normalizedLength >= 4 ? players.filter((p) => playerIdMatches(p.id, input)) : []),
    [players, input, normalizedLength]
  );

  const candidate: Player | null = matches.length === 1 ? matches[0] : null;
  const ambiguous = matches.length > 1;
  const notFound = normalizedLength >= 4 && matches.length === 0;
  const wrongRole = Boolean(candidate && candidate.role !== config.role);

  const numericAmount = Number(amount);
  const canSubmit =
    Boolean(candidate) &&
    !wrongRole &&
    Number.isInteger(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= 1_000_000 &&
    !busy;

  const resetInputs = () => {
    setInput('');
    setAmount('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (!candidate) {
      addToast(
        ambiguous ? 'Найдено несколько участников — введите больше символов ID.' : 'Введите ID участника.',
        'warning'
      );
      return;
    }
    if (wrongRole) {
      addToast(config.wrongRoleHint, 'error');
      return;
    }
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      addToast('Введите сумму больше нуля.', 'warning');
      return;
    }
    if (numericAmount > 1_000_000) {
      addToast('Слишком большая сумма.', 'warning');
      return;
    }

    setBusy(true);
    const response = await creditPlayer(candidate.id, numericAmount, kind);
    setBusy(false);

    if (!response.ok || !response.player) {
      addToast(response.error || 'Не удалось начислить.', 'error');
      void syncFromSupabase();
      return;
    }

    const entry: CreditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: response.player.name,
      shortId: shortPlayerId(response.player.id),
      amount: numericAmount,
      at: Date.now(),
    };

    setResult({ ...entry, newValue: response.value ?? 0 });
    setLog((previous) => [entry, ...previous].slice(0, 8));
    addToast(`+${numberFormat.format(numericAmount)} ${config.unit} — ${response.player.name}`, 'success');
    resetInputs();

    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncFromSupabase();
    setRefreshing(false);
    addToast('Список участников обновлён.', 'info');
  };

  return (
    <div className="min-h-[100dvh] bg-gray-900 pb-10">
      <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
        <StaffLinks active={kind} />

        <header className="mt-4 flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${config.tone.iconBox}`}>
            <Icon size={24} className={config.tone.icon} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{config.title}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{config.subtitle}</p>
          </div>
        </header>

        {session && (
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-gray-500">Сессия:</span>
            <span className="text-gray-200 font-medium truncate max-w-[60%]">{session.name}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-gray-300 tracking-widest">
              {session.code}
            </span>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-sm">
              Сервер не настроен: начисления работают только на этом устройстве.
            </p>
          </div>
        )}

        {syncError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{syncError}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-4 bg-gray-800 rounded-2xl border border-gray-700 p-4 sm:p-5 shadow-xl"
        >
          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">
              ID участника
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value.toUpperCase().slice(0, 36));
                  setResult(null);
                }}
                placeholder="A1B2C3D4 или полный ID"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white font-mono tracking-wider placeholder-gray-500 placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-1 transition-all uppercase ${config.tone.focus}`}
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">
              ID показан на экране участника: короткий код или полный ID.
            </p>
          </div>

          {ambiguous && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-sm">
                Найдено несколько участников. Введите больше символов ID.
              </p>
            </div>
          )}

          {notFound && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">
                Участник не найден. Проверьте ID и сессию.
              </p>
            </div>
          )}

          {candidate && (
            <div
              className={`mt-3 rounded-xl border p-3 ${
                wrongRole ? 'bg-amber-500/10 border-amber-500/30' : config.tone.panel
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{candidate.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-gray-300 tracking-wider">
                      {shortPlayerId(candidate.id)}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                        candidate.role === 'buyer'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/30'
                      }`}
                    >
                      {candidate.role === 'buyer' ? 'ПОКУПАТЕЛЬ' : 'ПРОДАВЕЦ'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 text-[11px]">{config.valueLabel}</p>
                  <p className={`font-bold ${wrongRole ? 'text-amber-300' : config.tone.value}`}>
                    {numberFormat.format(
                      kind === 'money' ? candidate.balance : candidate.usefulnessPoints
                    )}{' '}
                    <span className="text-xs font-normal text-gray-400">{config.unit}</span>
                  </p>
                </div>
              </div>
              {wrongRole && (
                <p className="text-amber-300 text-xs mt-2">
                  {config.wrongRoleHint}{' '}
                  <Link to={config.otherPath} className="underline font-medium">
                    Перейти
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="text-gray-300 text-sm font-medium mb-2 block">
              Сколько начислить
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/\D/g, '').slice(0, 7));
                  setResult(null);
                }}
                placeholder="0"
                className={`w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 pr-16 text-white text-2xl font-bold placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${config.tone.focus}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                {config.unit}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-2">
              {config.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmount(String(preset));
                    setResult(null);
                  }}
                  className={`rounded-xl border py-2 text-sm font-semibold transition-all ${
                    amount === String(preset)
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-gray-700/50 border-gray-600 text-gray-300 active:bg-gray-600'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`mt-4 w-full text-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:text-gray-400 ${config.tone.button}`}
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Начисляем...
              </>
            ) : (
              <>
                <Icon size={18} />
                Начислить
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-emerald-300 font-semibold">
                {result.name} · +{numberFormat.format(result.amount)} {config.unit}
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                ID {result.shortId} · {config.valueLabel} теперь{' '}
                {numberFormat.format(result.newValue)} {config.unit}
              </p>
            </div>
          </div>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-white font-semibold text-sm sm:text-base">
              {config.rolePlural} · {rolePlayers.length}
            </h2>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-gray-400 hover:text-white disabled:text-gray-600 transition-colors flex items-center gap-1 text-xs"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>

          {rolePlayers.length === 0 ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 text-center">
              <p className="text-gray-400 text-sm">
                Пока никто не подключился как {config.roleLabel}.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...rolePlayers]
                .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                .map((player) => {
                  const value =
                    kind === 'money' ? player.balance : player.usefulnessPoints;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => {
                        setInput(shortPlayerId(player.id));
                        setResult(null);
                      }}
                      className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-700 border border-gray-700 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] px-2 py-1 rounded-md bg-gray-700 text-gray-300 tracking-wider flex-shrink-0">
                          {shortPlayerId(player.id)}
                        </span>
                        <span className="text-gray-200 text-sm truncate">{player.name}</span>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${config.tone.value}`}>
                        {numberFormat.format(value)}{' '}
                        <span className="text-[10px] font-normal text-gray-500">{config.unit}</span>
                      </span>
                    </button>
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

        {log.length > 0 && (
          <section className="mt-6">
            <h2 className="text-white font-semibold text-sm sm:text-base mb-2">
              Последние начисления на этом устройстве
            </h2>
            <div className="bg-gray-800 rounded-xl border border-gray-700 divide-y divide-gray-700 overflow-hidden">
              {log.map((entry) => (
                <div key={entry.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-200 text-sm truncate">{entry.name}</p>
                    <p className="text-gray-500 text-[11px] font-mono tracking-wider">
                      {entry.shortId} ·{' '}
                      {new Date(entry.at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${config.tone.value}`}>
                    +{numberFormat.format(entry.amount)} {config.unit}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 space-y-2">
          <Link
            to={config.otherPath}
            className="flex items-center justify-between gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 transition-colors"
          >
            <span>{config.otherTitle}</span>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>
          <Link
            to="/host"
            className="block text-center text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
          >
            ← В панель организатора
          </Link>
        </div>
      </div>
    </div>
  );
}
