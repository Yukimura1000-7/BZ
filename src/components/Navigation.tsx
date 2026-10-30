import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Home, Shield, Monitor, ArrowLeftRight, LogOut } from 'lucide-react';

export default function Navigation() {
  const { currentPlayerId, isAdmin, isAuthenticated, timerRunning, session, logout } = useGameStore();
  const location = useLocation();
  const navigate = useNavigate();

  const timer = session?.timer ?? 0;

  console.log('🧭 Navigation render:', {
    currentPlayerId,
    isAdmin,
    isAuthenticated,
    pathname: location.pathname,
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isPlayer = currentPlayerId && !isAuthenticated;
  const isAuthAdmin = (isAdmin || isAuthenticated) && !currentPlayerId;

  return (
    <>
      {/* Timer bar */}
      {timerRunning && (
        <div className={`fixed top-0 left-0 right-0 z-50 h-1 ${timer <= 120 ? 'bg-red-500' : 'bg-blue-500'} transition-colors`} />
      )}
      
      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur border-t border-gray-700 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {isPlayer && (
            <>
              <Link
                to="/player"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[56px] ${location.pathname === '/player' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <Home size={20} />
                <span className="text-[10px] mt-0.5">Главная</span>
              </Link>
              <Link
                to="/deal"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[56px] ${location.pathname === '/deal' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <ArrowLeftRight size={20} />
                <span className="text-[10px] mt-0.5">Сделки</span>
              </Link>
            </>
          )}
          {isAuthAdmin && (
            <>
              <Link
                to="/admin"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[56px] ${location.pathname === '/admin' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <Shield size={20} />
                <span className="text-[10px] mt-0.5">Админ</span>
              </Link>
              <Link
                to="/screen"
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[56px] ${location.pathname === '/screen' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <Monitor size={20} />
                <span className="text-[10px] mt-0.5">Экран</span>
              </Link>
            </>
          )}
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[56px] text-gray-400 active:text-red-400 transition-colors"
            title="Выйти"
          >
            <LogOut size={20} />
            <span className="text-[10px] mt-0.5">Выход</span>
          </button>
        </div>
        {/* Timer display */}
        {timerRunning && (
          <div className={`text-center text-xs font-mono pb-1 ${timer <= 120 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
            ⏱ {formatTime(timer)}
          </div>
        )}
      </nav>
    </>
  );
}
