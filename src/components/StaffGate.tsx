import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { isSupabaseConfigured } from '../lib/supabase';

interface StaffGateProps {
  children: ReactNode;
}

/**
 * Защита служебных страниц (деньги / очки).
 * Персонал вводит код сессии и PIN, который выдаёт организатор.
 */
export default function StaffGate({ children }: StaffGateProps) {
  const { session, staffSessionId, authenticateStaff } = useGameStore();
  const [code, setCode] = useState(session?.code ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const unlocked =
    Boolean(session) && staffSessionId === session?.id && session?.status !== 'ended';

  if (unlocked) return <>{children}</>;

  const sessionEnded =
    Boolean(session) && staffSessionId === session?.id && session?.status === 'ended';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');

    if (!code.trim()) {
      setError('Введите код сессии.');
      return;
    }
    if (!pin.trim()) {
      setError('Введите PIN для персонала.');
      return;
    }

    setBusy(true);
    const result = await authenticateStaff(code, pin);
    setBusy(false);

    if (!result.ok) {
      setError(result.error || 'Не удалось войти.');
      return;
    }

    setPin('');
  };

  if (sessionEnded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-sm w-full bg-gray-800 rounded-2xl p-6 border border-gray-700 text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Сессия завершена</h1>
          <p className="text-gray-400 text-sm mb-5">
            Начисления в этой сессии больше недоступны.
          </p>
          <Link
            to="/host"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            В панель организатора
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

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Вход для персонала</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Служебная страница для начислений участникам
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700 space-y-4"
        >
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Код сессии</label>
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError('');
              }}
              placeholder="ABC123"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all uppercase"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">PIN для персонала</label>
            <div className="relative">
              <KeyRound
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="password"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value);
                  setError('');
                }}
                placeholder="PIN"
                autoComplete="off"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">PIN выдаёт организатор сессии.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-xs">
              Сервер не настроен. Начисления будут работать только на этом устройстве.
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !code.trim() || !pin.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <Lock size={18} />
                Войти
              </>
            )}
          </button>

          <Link
            to="/"
            className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} />
            На главную
          </Link>
        </form>
      </div>
    </div>
  );
}
