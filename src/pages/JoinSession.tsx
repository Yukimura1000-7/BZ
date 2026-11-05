import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Link as LinkIcon,
  Loader2,
  UserPlus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { isSupabaseConfigured } from '../lib/supabase';

export default function JoinSession() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { session, joinSession, loadSessionByCode } = useGameStore();
  const { addToast } = useToastStore();

  const [sessionCode, setSessionCode] = useState((code || '').toUpperCase());
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (code) setSessionCode(code.toUpperCase());
  }, [code]);

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    setError('');

    if (!name.trim()) {
      setError('Введите имя.');
      return;
    }
    if (!sessionCode.trim()) {
      setError('Введите код сессии.');
      return;
    }

    setBusy(true);
    try {
      const current = await loadSessionByCode(sessionCode);

      if (!current) {
        setError(
          isSupabaseConfigured
            ? 'Сессия не найдена. Проверьте код или обратитесь к организатору.'
            : 'Сессия не найдена на этом устройстве. В локальном режиме её должен создать организатор на этом же устройстве.'
        );
        return;
      }

      if (current.status === 'ended') {
        setError('Эта сессия уже завершена.');
        return;
      }

      const player = await joinSession(current.id, name);

      if (!player) {
        const latestError = useGameStore.getState().syncError;
        setError(latestError || 'Не удалось подключиться. Попробуйте ещё раз.');
        return;
      }

      addToast(
        player.role === 'buyer'
          ? 'Вы подключились как покупатель!'
          : 'Вы подключились как продавец!',
        'success'
      );
      navigate('/player', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const localSessionMatches = Boolean(session && session.code === sessionCode.trim().toUpperCase());

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
            <LinkIcon size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Присоединиться к сессии</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Введите код от организатора и ваше имя
          </p>
        </div>

        <div
          className={`mb-4 rounded-xl p-3 flex items-center gap-2 text-sm ${
            isSupabaseConfigured
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`}
        >
          {isSupabaseConfigured ? (
            <>
              <Wifi size={16} className="flex-shrink-0" />
              <span>Сервер подключён — вход работает с любого устройства</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="flex-shrink-0" />
              <span>Локальный режим — вход только на устройстве организатора</span>
            </>
          )}
        </div>

        <form
          onSubmit={handleJoin}
          className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700 space-y-4"
        >
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Код сессии</label>
            <input
              type="text"
              value={sessionCode}
              onChange={(event) => {
                setSessionCode(event.target.value.toUpperCase());
                setError('');
              }}
              placeholder="ABC123"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Ваше имя</label>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              placeholder="Например, Иван"
              maxLength={40}
              autoComplete="off"
              autoFocus={Boolean(code)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !sessionCode.trim() || busy}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Подключаемся...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Подключиться
                <ArrowRight size={18} />
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

        {localSessionMatches && session && (
          <div className="mt-4 bg-gray-800/60 rounded-xl p-3 border border-gray-700 text-center">
            <p className="text-gray-400 text-xs">Сессия найдена</p>
            <p className="text-white font-semibold mt-0.5">{session.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">Код {session.code}</p>
          </div>
        )}
      </div>
    </div>
  );
}
