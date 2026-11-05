import { Link } from 'react-router-dom';
import { Banknote, Shield, Sparkles, Trophy } from 'lucide-react';

interface StaffLinksProps {
  active: 'host' | 'money' | 'points' | 'leaderboard';
}

const links = [
  { id: 'host' as const, to: '/host', label: 'Сессия', icon: Shield },
  { id: 'money' as const, to: '/money', label: 'Деньги', icon: Banknote },
  { id: 'points' as const, to: '/points', label: 'Очки', icon: Sparkles },
  { id: 'leaderboard' as const, to: '/leaderboard', label: 'Лидеры', icon: Trophy },
];

export default function StaffLinks({ active }: StaffLinksProps) {
  return (
    <nav className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-800/80 border border-gray-700 p-1">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = active === link.id;
        return (
          <Link
            key={link.id}
            to={link.to}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
              isActive
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:text-gray-200 active:bg-gray-700/50'
            }`}
          >
            <Icon size={16} className={isActive ? 'text-blue-400' : ''} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
