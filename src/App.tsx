import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import Registration from './pages/Registration';
import PlayerDashboard from './pages/PlayerDashboard';
import AdminPanel from './pages/AdminPanel';
import MainScreen from './pages/MainScreen';
import DealPage from './pages/DealPage';
import JoinSession from './pages/JoinSession';
import AdminLogin from './pages/AdminLogin';
import Navigation from './components/Navigation';
import TimerEffect from './components/TimerEffect';
import ToastContainer from './components/ToastContainer';
import CurrencyUpdater from './components/CurrencyUpdater';
import StorageSync from './components/StorageSync';

function App() {
  const { currentPlayerId, isAdmin, isAuthenticated, session } = useGameStore();

  return (
    <Router>
      <TimerEffect />
      <CurrencyUpdater />
      <StorageSync />
      <ToastContainer />
      <div className="min-h-screen min-h-[100dvh] bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route path="/join" element={<JoinSession />} />
          <Route path="/join/:code" element={<JoinSession />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/player" element={
            currentPlayerId && !isAuthenticated ? <PlayerDashboard /> : <Navigate to="/" />
          } />
          <Route path="/deal" element={
            currentPlayerId && !isAuthenticated ? <DealPage /> : <Navigate to="/" />
          } />
          <Route path="/admin" element={
            isAuthenticated && !currentPlayerId ? <AdminPanel /> : <Navigate to="/" />
          } />
          <Route path="/screen" element={
            isAuthenticated && !currentPlayerId ? <MainScreen /> : <Navigate to="/" />
          } />
        </Routes>
        {(currentPlayerId || isAdmin) && <Navigation />}
      </div>
    </Router>
  );
}

export default App;
