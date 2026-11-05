import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Registration from './pages/Registration';
import JoinSession from './pages/JoinSession';
import PlayerDashboard from './pages/PlayerDashboard';
import HostPanel from './pages/HostPanel';
import MoneyPage from './pages/MoneyPage';
import PointsPage from './pages/PointsPage';
import ToastContainer from './components/ToastContainer';
import SupabaseRealtime from './components/SupabaseRealtime';
import SessionInitializer from './components/SessionInitializer';
import { useGameStore } from './store/gameStore';

function App() {
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);

  return (
    <Router>
      <SessionInitializer />
      <SupabaseRealtime />
      <ToastContainer />
      <div className="min-h-screen min-h-[100dvh] bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route path="/join" element={<JoinSession />} />
          <Route path="/join/:code" element={<JoinSession />} />
          <Route
            path="/player"
            element={currentPlayerId ? <PlayerDashboard /> : <Navigate to="/join" replace />}
          />
          <Route path="/host" element={<HostPanel />} />
          <Route path="/money" element={<MoneyPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/admin" element={<Navigate to="/host" replace />} />
          <Route path="/admin-login" element={<Navigate to="/host" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
