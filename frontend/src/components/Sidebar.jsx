import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { LayoutDashboard, Receipt, PieChart, TrendingUp, Bot, LogOut, Wallet, X, ChevronRight } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload Receipt', path: '/upload', icon: Receipt },
  { name: 'Analytics', path: '/analytics', icon: PieChart },
  { name: 'Forecast', path: '/forecast', icon: TrendingUp },
  { name: 'AI Advisor', path: '/ai-advisor', icon: Bot },
  { name: 'Budget', path: '/budget', icon: Wallet },
];

export default function Sidebar({ isOpen, closeSidebar }) {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const parts = user.user_metadata.full_name.split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    return user?.email ? user.email[0].toUpperCase() : 'U';
  };

  const handleLogout = async () => {
    try {
      const { error } = await logout();
      if (error) throw error;
      showSuccess('Logged out successfully.');
      navigate('/login');
    } catch (error) {
      showError(error.message || 'Could not log out.');
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[50] md:hidden transition-all duration-500 animate-in fade-in"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`
          fixed md:static top-0 left-0 z-[60] w-72 h-screen
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl shadow-black/50 md:shadow-none
        `}
      >
        <div className="flex flex-col flex-1 h-0 overflow-y-auto custom-scrollbar">
          <div className="h-24 flex items-center justify-between px-8 shrink-0 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-800">
                ₹
              </div>
              <span className="text-xl font-black tracking-tighter text-white uppercase">EXPENSE<span className="text-blue-500">IQ</span></span>
            </div>
            <button onClick={closeSidebar} className="md:hidden p-2 text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-6 py-8 space-y-3">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6 pl-2">Intelligence Suite</p>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={closeSidebar}
                  className={`
                    group flex items-center justify-between px-4 py-3.5 rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest transition-all duration-300
                    ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200 hover:translate-x-1'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 opacity-60'}`} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-all duration-300 ${active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-8 border-t border-slate-800 shrink-0 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black shrink-0 text-sm shadow-xl shadow-blue-900/20 border border-white/10">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate uppercase tracking-tighter">
                {user?.user_metadata?.full_name || 'Operative'}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-widest">ID: Verified</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-300 group shadow-lg"
          >
            <LogOut className="w-4 h-4 text-slate-700 group-hover:text-rose-500 transition-colors" />
            Terminate Session
          </button>
        </div>
      </aside>
    </>
  );
}
