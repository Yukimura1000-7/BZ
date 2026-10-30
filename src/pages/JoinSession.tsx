import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { QRCodeSVG } from 'qrcode.react';
import { UserPlus, ArrowRight, AlertCircle, Wifi, WifiOff, Info, RefreshCw } from 'lucide-react';

export default function JoinSession() {
  const [name, setName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinedPlayer, setJoinedPlayer] = useState<any>(null);
  const { code } = useParams<{ code: string }>();
  const { session, players, joinSession, setCurrentPlayer, loadSessionByCode, isSupabaseConnected } = useGameStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      setSessionCode(code.toUpperCase());
    }
  }, [code]);

  const handleJoin = async () => {
    console.log('🎯 handleJoin called');
    console.log('🎯 name:', name);
    console.log('🎯 sessionCode:', sessionCode);
    console.log('🎯 local session:', session);
    
    if (!name.trim()) {
      setError('Введите имя');
      return;
    }
    if (!sessionCode.trim()) {
      setError('Введите код сессии');
      return;
    }

    setLoading(true);
    setError('');

    let currentSession = session;

    // Если сессии нет локально или код не совпадает — пробуем загрузить
    if (!currentSession || currentSession.code !== sessionCode.toUpperCase()) {
      console.log('🎯 No matching local session, trying to load...');
      const loaded = await loadSessionByCode(sessionCode.toUpperCase());
      console.log('🎯 Loaded session:', loaded);
      
      if (!loaded) {
        if (!isSupabaseConnected) {
          setError('Сервер синхронизации не подключён. Сессия должна быть создана на этом устройстве. Попросите администратора создать сессию здесь, или настройте Supabase для работы между устройствами.');
        } else {
          setError('Сессия не найдена. Проверьте код или попросите администратора создать сессию.');
        }
        setLoading(false);
        return;
      }
      currentSession = loaded;
    }

    // Проверяем код
    if (!currentSession) {
      setError('Сессия не найдена');
      setLoading(false);
      return;
    }
    if (currentSession.code !== sessionCode.toUpperCase()) {
      setError('Неверный код сессии');
      setLoading(false);
      return;
    }
    if (currentSession.status === 'ended') {
      setError('Сессия завершена');
      setLoading(false);
      return;
    }

    const player = joinSession(currentSession.id, name.trim());
    if (player) {
      setJoinedPlayer(player);
      setError('');
      const roleText = player.role === 'buyer' ? 'Покупатель' : 'Продавец';
      addToast(`Вы подключились как ${roleText}!`, 'success');
    } else {
      setError('Не удалось подключиться к сессии');
      addToast('Ошибка подключения', 'error');
    }
    setLoading(false);
  };

  const handleEnterGame = () => {
    if (joinedPlayer) {
      setCurrentPlayer(joinedPlayer.id);
      navigate('/player');
    }
  };

  // If already joined, show welcome
  if (joinedPlayer) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700 max-w-sm w-full text-center animate-slide-up">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎮</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Добро пожаловать!</h2>
          <p className="text-blue-400 font-semibold mt-2">{joinedPlayer.name}</p>
          <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
            joinedPlayer.role === 'buyer' 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
          }`}>
            {joinedPlayer.role === 'buyer' ? '🛒 ПОКУПАТЕЛЬ' : '💼 ПРОДАВЕЦ'}
          </div>
          <p className="text-gray-500 text-xs mt-2">Сессия: {session?.name}</p>

          <div className="bg-white rounded-xl p-4 my-5 inline-block">
            <QRCodeSVG value={joinedPlayer.qrCode} size={160} />
          </div>

          <p className="text-gray-400 text-sm mb-2">Ваш QR-код для сделок</p>

          <div className="bg-gray-700/50 rounded-xl p-4 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Баланс:</span>
              <span className="text-emerald-400 font-bold">{joinedPlayer.balance} ₽</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Зарплата:</span>
              <span className="text-yellow-400">{joinedPlayer.salary} ₽ / этап</span>
            </div>
          </div>

          <button
            onClick={handleEnterGame}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Войти в игру <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
            <span className="text-3xl">🔗</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Битва за капитал</h1>
          <p className="text-gray-400 mt-1 text-sm">Введите код сессии и ваше имя</p>
        </div>

        {/* Connection status */}
        <div className={`mb-4 rounded-xl p-3 flex items-center gap-2 text-sm ${
          isSupabaseConnected 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
        }`}>
          {isSupabaseConnected ? (
            <>
              <Wifi size={16} className="flex-shrink-0" />
              <span>Сервер подключён — поиск сессий на всех устройствах</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="flex-shrink-0" />
              <span>Локальный режим — сессия должна быть создана на этом устройстве</span>
            </>
          )}
        </div>

        <div className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Код сессии</label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => { setSessionCode(e.target.value.toUpperCase()); setError(''); }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Ваше имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="Введите имя..."
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleJoin()}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={!name.trim() || !sessionCode.trim() || loading}
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Поиск сессии...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Подключиться
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 text-gray-400 hover:text-white text-sm py-2 transition-colors"
          >
            ← На главную
          </button>
        </div>

        {/* Help section */}
        {!isSupabaseConnected && (
          <div className="mt-4 bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-300 font-medium mb-1">Как подключиться?</p>
                <ol className="text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Администратор создаёт сессию на этом устройстве</li>
                  <li>Вам сообщают код сессии</li>
                  <li>Вы вводите код и имя выше</li>
                </ol>
                <p className="text-gray-500 text-xs mt-2">
                  💡 Для работы между разными устройствами администратору нужно настроить Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {session && session.code === sessionCode.toUpperCase() && (
          <div className="mt-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-xs">Найдена сессия на этом устройстве</p>
            <p className="text-white font-semibold mt-1">{session.name}</p>
            <p className="text-gray-500 text-xs mt-1">Игроков: {players.length}</p>
          </div>
        )}
      </div>
    </div>
  );
}
