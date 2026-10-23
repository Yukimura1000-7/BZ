import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { Play, Pause, Square, DollarSign, TrendingUp, Users, AlertTriangle, Banknote, Gavel, LogOut, Copy, Check, QrCode, Shield } from 'lucide-react';

export default function AdminPanel() {
  const {
    players, deals, session, timerRunning,
    startPhase, pausePhase, resumePhase, endPhase,
    deposit, withdraw, updateCurrencyRate, currencyRates,
    addEvent, events, logout, endSession, createSession
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'control' | 'bank' | 'market' | 'events'>('control');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [bankAmount, setBankAmount] = useState(0);
  const [newRate, setNewRate] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState<'currency' | 'market' | 'random'>('market');
  const [copied, setCopied] = useState(false);

  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = () => {
    const name = newSessionName.trim() || 'Игровая сессия';
    const created = createSession(name);
    setNewSessionName('');
    addToast(`Сессия "${name}" создана! Код: ${created.code}`, 'success', 5000);
  };

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gray-900">
        <div className="max-w-sm w-full">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 text-center">
            <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield size={24} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Создать сессию</h2>
            <p className="text-gray-400 text-sm mb-4">
              Создайте игровую сессию и поделитесь кодом с участниками
            </p>
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="Название сессии (необязательно)"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all mb-3"
            />
            <button
              onClick={handleCreateSession}
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Shield size={18} />
              Создать сессию
            </button>
          </div>
        </div>
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

  const totalMoney = players.reduce((sum, p) => sum + p.balance, 0);
  const confirmedDeals = deals.filter(d => d.status === 'confirmed');
  const buyersCount = players.filter(p => p.role === 'buyer').length;
  const sellersCount = players.filter(p => p.role === 'seller').length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const tabs = [
    { id: 'control', label: 'Управление', icon: Play },
    { id: 'bank', label: 'Банк', icon: Banknote },
    { id: 'market', label: 'Рынок', icon: TrendingUp },
    { id: 'events', label: 'События', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-[100dvh] pb-24 bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 pt-10 pb-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 min-w-0">
            <Gavel size={18} className="text-white flex-shrink-0" />
            <span className="truncate">Панель организатора</span>
          </h1>
          <button
            onClick={handleLogout}
            className="bg-gray-700 active:bg-red-500/20 border border-gray-600 active:border-red-500/50 text-gray-300 active:text-red-400 rounded-xl px-2.5 py-2 transition-all flex items-center gap-1.5 flex-shrink-0"
            title="Выйти из панели"
          >
            <LogOut size={14} />
            <span className="text-xs hidden sm:inline">Выход</span>
          </button>
        </div>

        {/* Session info */}
        <div className="bg-gray-700/50 rounded-xl p-3 mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-gray-400 text-xs truncate">{session.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Код:</span>
              <span className="font-mono font-bold text-white tracking-wider">{session.code}</span>
              <button
                onClick={handleCopyCode}
                className="text-gray-400 active:text-blue-400 transition-colors"
              >
                {copied ? <Check size={14} className="text-blue-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
            <QrCode size={32} className="text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <p className="text-gray-400 text-[10px] sm:text-xs">Этап</p>
            <p className="text-white font-bold text-sm sm:text-base">{phase}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <p className="text-gray-400 text-[10px] sm:text-xs">Таймер</p>
            <p className={`font-mono font-bold text-sm sm:text-base ${timer <= 120 && timerRunning ? 'text-red-400' : 'text-white'}`}>
              {formatTime(timer)}
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
            <p className="text-blue-400 text-[10px] sm:text-xs">🛒</p>
            <p className="text-blue-400 font-bold text-sm sm:text-base">{buyersCount}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
            <p className="text-red-400 text-[10px] sm:text-xs">💼</p>
            <p className="text-red-400 font-bold text-sm sm:text-base">{sellersCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-1 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1 px-3 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Control Tab */}
        {activeTab === 'control' && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">⏱ Управление таймером</h3>
              <div className="flex gap-2">
                {!timerRunning ? (
                  <button
                    onClick={() => startPhase(600)}
                    className="flex-1 bg-blue-500 active:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Play size={16} /> Старт этапа
                  </button>
                ) : (
                  <>
                    <button
                      onClick={pausePhase}
                      className="flex-1 bg-white active:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Pause size={16} /> Пауза
                    </button>
                    <button
                      onClick={resumePhase}
                      className="flex-1 bg-blue-500 active:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Play size={16} /> Продолжить
                    </button>
                  </>
                )}
                <button
                  onClick={endPhase}
                  disabled={!timerRunning}
                  className="bg-red-500 active:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Square size={16} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[180, 300, 600, 900].map(d => (
                  <button
                    key={d}
                    onClick={() => startPhase(d)}
                    className="bg-gray-700 active:bg-gray-600 text-white py-2 rounded-lg text-xs sm:text-sm transition-all"
                  >
                    {d / 60} мин
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">📊 Статистика</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-400">Денежная масса:</span>
                  <span className="text-white font-bold">{totalMoney} ₽</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-400">Совершено сделок:</span>
                  <span className="text-blue-400 font-bold">{confirmedDeals.length}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-400">Объём сделок:</span>
                  <span className="text-white font-bold">
                    {confirmedDeals.reduce((sum, d) => sum + d.amount, 0)} ₽
                  </span>
                </div>
              </div>
            </div>

            {/* Players list */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Users size={16} className="text-white" />
                Игроки ({players.length})
              </h3>
              {players.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Пока никто не подключился. Поделитесь кодом <span className="text-white font-mono">{session.code}</span>
                </p>
              ) : (
                <div className="space-y-1.5">
                  {players.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-500 text-xs w-5 flex-shrink-0">{i + 1}.</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                          p.role === 'buyer' ? 'bg-blue-500' : 'bg-red-500'
                        }`}>
                          {p.name[0]}
                        </div>
                        <div className="min-w-0">
                          <span className="text-white font-medium text-sm truncate block">{p.name}</span>
                          <span className="text-gray-500 text-[10px]">
                            {p.role === 'buyer' ? '🛒 Покупатель' : '💼 Продавец'}
                          </span>
                        </div>
                      </div>
                      <span className="text-white font-bold text-sm flex-shrink-0 ml-2">{p.balance} ₽</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* End session */}
            <button
              onClick={() => {
                if (window.confirm('Завершить сессию? Все данные будут потеряны.')) {
                  endSession();
                  addToast('Сессия завершена', 'warning');
                  navigate('/');
                }
              }}
              className="w-full bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 text-red-400 font-medium py-3 rounded-xl transition-all"
            >
              Завершить сессию
            </button>
          </div>
        )}

        {/* Bank Tab */}
        {activeTab === 'bank' && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <DollarSign size={16} className="text-white" />
                Банковские операции
              </h3>
              
              <div className="space-y-3">
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                >
                  <option value="">Выберите игрока</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.role === 'buyer' ? '🛒' : '💼'} {p.name} ({p.balance} ₽)
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  inputMode="numeric"
                  value={bankAmount}
                  onChange={(e) => setBankAmount(parseInt(e.target.value) || 0)}
                  placeholder="Сумма"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { if (selectedPlayer && bankAmount > 0) { deposit(selectedPlayer, bankAmount); setBankAmount(0); }}}
                    disabled={!selectedPlayer || bankAmount <= 0}
                    className="bg-blue-500 active:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all text-sm sm:text-base"
                  >
                    + Выдать
                  </button>
                  <button
                    onClick={() => { if (selectedPlayer && bankAmount > 0) { withdraw(selectedPlayer, bankAmount); setBankAmount(0); }}}
                    disabled={!selectedPlayer || bankAmount <= 0}
                    className="bg-red-500 active:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all text-sm sm:text-base"
                  >
                    − Списать
                  </button>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBankAmount(amt)}
                      className="bg-gray-700 active:bg-gray-600 text-white py-2 rounded-lg text-xs sm:text-sm transition-all"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp size={16} className="text-white" />
                Курсы валют
              </h3>
              <div className="space-y-2">
                {currencyRates.map(c => (
                  <div key={c.currency} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm sm:text-base">{c.currency}</span>
                      <span className={`font-bold text-sm sm:text-base ${c.change >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {c.rate.toLocaleString()} ₽
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={selectedCurrency === c.currency ? newRate : ''}
                        onFocus={() => setSelectedCurrency(c.currency)}
                        onChange={(e) => { setSelectedCurrency(c.currency); setNewRate(parseInt(e.target.value) || 0); }}
                        placeholder="Новый курс"
                        className="flex-1 bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => { if (newRate > 0) { updateCurrencyRate(c.currency, newRate); setNewRate(0); }}}
                        className="bg-blue-500 active:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-all"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <AlertTriangle size={16} className="text-red-400" />
                Создать событие
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Название события"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                />
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Описание..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none text-sm sm:text-base"
                />
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                >
                  <option value="market">📈 Рыночное</option>
                  <option value="currency">💱 Валютное</option>
                  <option value="random">🎲 Случайное</option>
                </select>
                <button
                  onClick={() => {
                    if (eventTitle) {
                      addEvent({ title: eventTitle, description: eventDesc, type: eventType });
                      setEventTitle('');
                      setEventDesc('');
                    }
                  }}
                  disabled={!eventTitle}
                  className="w-full bg-red-500 active:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all text-sm sm:text-base"
                >
                  🚀 Выпустить событие
                </button>
              </div>
            </div>

            {/* Event history */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">📜 История событий</h3>
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Нет событий</p>
              ) : (
                <div className="space-y-2">
                  {events.map(e => (
                    <div key={e.id} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          {e.type === 'market' ? '📈' : e.type === 'currency' ? '💱' : '🎲'}
                        </span>
                        <span className="text-white font-medium text-sm">{e.title}</span>
                      </div>
                      {e.description && (
                        <p className="text-gray-400 text-xs mt-1">{e.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
