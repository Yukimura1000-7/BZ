import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { Lock, User, AlertCircle, Shield } from 'lucide-react';

export default function AdminLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login: loginAction } = useGameStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    const success = await loginAction(login.trim(), password.trim());
    if (success) {
      addToast('Добро пожаловать, администратор!', 'success');
      navigate('/admin');
    } else {
      setError('Неверный логин или пароль');
      addToast('Ошибка авторизации', 'error');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Вход для администратора</h1>
          <p className="text-gray-400 mt-1 text-sm">Введите учетные данные</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Логин</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => { setLogin(e.target.value); setError(''); }}
                  placeholder="admin"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Lock size={16} />
              Войти
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full mt-3 text-gray-400 hover:text-white text-sm py-2 transition-colors"
          >
            ← На главную
          </button>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-500 text-xs text-center">
              По умолчанию: <span className="text-white font-mono">admin</span> / <span className="text-white font-mono">admin</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
