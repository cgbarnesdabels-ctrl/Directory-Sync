import React from 'react';
import { Fingerprint, Video, RotateCcw, Smartphone, ShieldCheck, History } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'passkeys', label: 'Passkeys', icon: Fingerprint },
    { id: 'workspace', label: 'Workspace', icon: Video },
    { id: 'ios-guide', label: 'Mobile', icon: Smartphone },
    { id: 'reset-flow', label: 'Reset', icon: RotateCcw },
    { id: 'soc', label: 'Security', icon: ShieldCheck },
  ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-600 font-bold bg-indigo-50/70'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
