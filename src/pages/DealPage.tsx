import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Scan, Check, X, ArrowRight, AlertCircle } from 'lucide-react';

export default function DealPage() {
  const { players, currentPlayerId, createDeal, confirmDeal, rejectDeal, deals } = useGameStore();
  const player = players.find(p => p.id === currentPlayerId);
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<'select' | 'create' | 'pending'>('select');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedGoods, setSelectedGoods] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState('');

  if (!player) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gray-900">
        <div className="max-w-sm w-full bg-gray-800 rounded-2xl p-6 border border-gray-700 text-center">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Игрок не найден</h2>
          <p className="text-gray-400 text-sm mb-4">
            Данные игрока не загружены. Вернитесь на главную и попробуйте снова.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const isBuyer = player.role === 'buyer';
  const isSeller = player.role === 'seller';

  // Check for pending deals involving this player
  const myPendingDeal = deals.find(
    d => d.status === 'pending' && (d.sellerId === player.id || d.buyerId === player.id)
  );

  const handleCreateDeal = () => {
    setError('');
    
    if (!selectedPlayer || !selectedGoods || quantity <= 0 || amount <= 0) {
      setError('Заполните все поля корректно');
      return;
    }

    const otherPlayer = players.find(p => p.id === selectedPlayer);
    if (!otherPlayer) return;

    // Валидация ролей: покупатель может работать только с продавцами и наоборот
    if (isBuyer && otherPlayer.role !== 'seller') {
      setError('Вы можете совершать сделки только с продавцами');
      return;
    }
    if (isSeller && otherPlayer.role !== 'buyer') {
      setError('Вы можете совершать сделки только с покупателями');
      return;
    }

    // Проверка баланса покупателя
    if (isBuyer) {
      if (amount > player.balance) {
        setError(`Недостаточно средств. Ваш баланс: ${player.balance} ₽`);
        return;
      }
    }

    // Проверка наличия товара у продавца
    if (isSeller) {
      const available = player.goods[selectedGoods] || 0;
      if (quantity > available) {
        setError(`Недостаточно товара. У вас: ${available} шт.`);
        return;
      }
    }
    
    // Роль уже назначена — определяем sellerId/buyerId по роли игрока
    const sellerId = isSeller ? player.id : selectedPlayer;
    const buyerId = isSeller ? selectedPlayer : player.id;
    
    createDeal(sellerId, buyerId, selectedGoods, quantity, amount);
    setMode('pending');
  };

  const handleConfirm = () => {
    if (myPendingDeal) {
      confirmDeal(myPendingDeal.id, player.id);
      setMode('select');
      // Вибрация на мобильных устройствах
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    }
  };

  const handleReject = () => {
    if (myPendingDeal) {
      rejectDeal(myPendingDeal.id);
      setMode('select');
    }
  };

  // If there's a pending deal, show confirmation
  if (myPendingDeal) {
    const otherPlayer = players.find(p => p.id === (myPendingDeal.sellerId === player.id ? myPendingDeal.buyerId : myPendingDeal.sellerId));
    const isMySell = myPendingDeal.sellerId === player.id;
    const iHaveConfirmed = isMySell ? myPendingDeal.sellerConfirmed : myPendingDeal.buyerConfirmed;
    const otherHasConfirmed = isMySell ? myPendingDeal.buyerConfirmed : myPendingDeal.sellerConfirmed;

    return (
      <div className="min-h-[100dvh] pb-24 bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-5 border border-white/30 shadow-2xl max-w-sm w-full animate-slide-up">
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Scan size={28} className="text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Новая сделка!</h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              {iHaveConfirmed ? 'Ожидание подтверждения партнёра...' : 'Подтвердите или отклоните'}
            </p>
          </div>

          <div className="bg-gray-700/50 rounded-xl p-3 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{isMySell ? 'Продажа' : 'Покупка'}</span>
              <span className="text-white font-medium">{myPendingDeal.goods}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Количество</span>
              <span className="text-white font-medium">{myPendingDeal.quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Сумма</span>
              <span className="text-white font-bold">{myPendingDeal.amount} ₽</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Партнёр</span>
              <span className="text-white font-medium">{otherPlayer?.name}</span>
            </div>
          </div>

          {/* Статус подтверждения */}
          <div className="bg-gray-700/30 rounded-xl p-3 mb-4">
            <p className="text-gray-400 text-xs mb-2">Статус подтверждения:</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">💼 Продавец</span>
                <span className={myPendingDeal.sellerConfirmed ? 'text-blue-400' : 'text-gray-500'}>
                  {myPendingDeal.sellerConfirmed ? '✓ Подтвердил' : '○ Ожидание'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">🛒 Покупатель</span>
                <span className={myPendingDeal.buyerConfirmed ? 'text-blue-400' : 'text-gray-500'}>
                  {myPendingDeal.buyerConfirmed ? '✓ Подтвердил' : '○ Ожидание'}
                </span>
              </div>
            </div>
          </div>

          {!iHaveConfirmed ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleReject}
                className="bg-red-500/20 active:bg-red-500/40 border border-red-500/50 text-red-400 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <X size={18} /> Отклонить
              </button>
              <button
                onClick={handleConfirm}
                className="bg-blue-500 active:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Check size={18} /> Подтвердить
              </button>
            </div>
          ) : (
            <div className="text-center py-3">
              <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Ожидание второй стороны...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'pending') {
    return (
      <div className="min-h-[100dvh] pb-24 bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-2xl max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Scan size={28} className="text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">Ожидание подтверждения</h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-2">Подождите, пока вторая сторона подтвердит сделку</p>
          <button
            onClick={() => { setMode('select'); setError(''); }}
            className="mt-5 text-gray-400 active:text-white transition-colors py-2"
          >
            ← Вернуться
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    const otherPlayer = players.find(p => p.id === selectedPlayer);
    
    return (
      <div className="min-h-[100dvh] pb-24 bg-gray-900 p-4">
        <button onClick={() => { setMode('select'); setError(''); }} className="text-gray-400 active:text-white mb-3 flex items-center gap-1 py-2">
          ← Назад
        </button>
        
        <h1 className="text-lg sm:text-xl font-bold text-white mb-4">Создание сделки</h1>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-3 mb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-gray-400 text-xs">Партнёр</p>
              <p className="text-white font-semibold text-sm sm:text-base">{otherPlayer?.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {otherPlayer?.role === 'buyer' ? '🛒 Покупатель' : '💼 Продавец'}
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold ${
              isBuyer 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              Вы: {isBuyer ? '🛒 Покупатель' : '💼 Продавец'}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
            {isBuyer 
              ? `💡 Вы можете только покупать. Ваш баланс: ${player.balance} ₽`
              : `💡 Вы можете только продавать свои товары.`
            }
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">
              {isSeller ? 'Товар для продажи' : 'Товар для покупки'}
            </label>
            <select
              value={selectedGoods}
              onChange={(e) => { setSelectedGoods(e.target.value); setError(''); }}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
            >
              <option value="">Выберите товар</option>
              {Object.keys(player.goods).map(good => (
                <option key={good} value={good}>
                  {good} ({isSeller ? `у вас: ${player.goods[good]}` : `в наличии у продавца`})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Количество</label>
              <input
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => { setQuantity(Math.max(1, parseInt(e.target.value) || 1)); setError(''); }}
                min={1}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Сумма (₽)</label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => { setAmount(Math.max(0, parseInt(e.target.value) || 0)); setError(''); }}
                min={0}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {isBuyer && amount > 0 && (
            <div className={`text-xs px-3 py-2 rounded-lg ${
              amount > player.balance 
                ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}>
              {amount > player.balance 
                ? `❌ Недостаточно средств (нужно ${amount} ₽, у вас ${player.balance} ₽)`
                : `✓ Достаточно средств. После покупки останется: ${player.balance - amount} ₽`
              }
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreateDeal}
            disabled={!selectedGoods || amount <= 0}
            className="w-full bg-blue-500 active:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isBuyer ? 'Купить' : 'Продать'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Player selection mode
  return (
    <div className="min-h-[100dvh] pb-24 bg-gray-900 p-4">
      <div className="mb-4">
        <h1 className="text-lg sm:text-xl font-bold text-white mb-1">Создание сделки</h1>
        <p className="text-gray-400 text-xs sm:text-sm">
          {isBuyer 
            ? 'Выберите продавца для покупки' 
            : 'Выберите покупателя для продажи'}
        </p>
        <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
          isBuyer 
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
            : 'bg-red-500/20 text-red-400 border border-red-500/40'
        }`}>
          Ваша роль: {isBuyer ? '🛒 Покупатель' : '💼 Продавец'}
        </div>
      </div>

      <div className="space-y-2">
        {players
          .filter(p => {
            if (p.id === player.id) return false;
            // Покупатели видят только продавцов, продавцы — только покупателей
            return isBuyer ? p.role === 'seller' : p.role === 'buyer';
          })
          .map(p => (
            <button
              key={p.id}
              onClick={() => { setSelectedPlayer(p.id); setMode('create'); setError(''); }}
              className="w-full bg-gray-800 active:bg-gray-700 border border-gray-700 rounded-xl p-3 sm:p-4 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                  p.role === 'buyer' ? 'bg-blue-500' : 'bg-red-500'
                }`}>
                  {p.name[0]}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-white font-medium text-sm sm:text-base truncate">{p.name}</p>
                  <p className="text-gray-500 text-xs">
                    {p.role === 'buyer' ? '🛒 Покупатель' : '💼 Продавец'} · {p.balance} ₽
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-500 flex-shrink-0 ml-2" />
            </button>
          ))}
      </div>

      {players.filter(p => p.id !== player.id && (isBuyer ? p.role === 'seller' : p.role === 'buyer')).length === 0 && (
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            {isBuyer 
              ? 'Нет доступных продавцов' 
              : 'Нет доступных покупателей'}
          </p>
          <p className="text-gray-600 text-xs mt-1">Дождитесь подключения других игроков</p>
        </div>
      )}
    </div>
  );
}
