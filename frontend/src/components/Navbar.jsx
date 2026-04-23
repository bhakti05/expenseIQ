import React from 'react';
import { Menu, Bell, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const parts = user.user_metadata.full_name.split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    return user?.email ? user.email[0].toUpperCase() : 'U';
  };

  return (
    <header className="h-20 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 md:px-10 sticky top-0 z-[30] transition-all duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-3 -ml-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-2xl transition-all border border-transparent hover:border-slate-800 shadow-xl"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden md:block">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Expense Workspace</p>
          <h2 className="text-white font-black tracking-tight text-lg">Track, scan, and optimize spending</h2>
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <span className="text-xl font-black tracking-tighter text-white uppercase">
          EXPENSE<span className="text-blue-500">IQ</span>
        </span>
      </div>

      <div className="flex items-center gap-4 md:gap-6">

        <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-xl shadow-blue-900/20 border border-white/10 hover:scale-105 transition-transform cursor-pointer">
          {getInitials()}
        </div>
      </div>
    </header>
  );
}
