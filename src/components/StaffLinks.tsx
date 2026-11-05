import { Link } from 'react-router-dom';
import { Banknote, Shield, Sparkles } from 'lucide-react';

interface StaffLinksProps {
  active: 'host' | 'money' | 'points';
}

const links = [
  { id: 'host' as const, to: '/host', label: 'Сессия', icon: Shield },
  { id: 'money' as const, to: '/money', label: 'Деньги', icon: Banknote },
  { id: 'points' as const, to: '/points', label: 'Очки', icon: Sparkles },
];

export default function StaffLinks({ active }: StaffLinksProps) {
  return (
    <nav className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-800/80 border border-gray-700 p-1">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = active === link.id;
        return (
          <Link
            key={link.id}
            to={link.to}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs sm:text-sm font-medium transition-all ${
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
