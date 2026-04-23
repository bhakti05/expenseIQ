import React from 'react';
import { IndianRupee, AlertCircle, TrendingUp, Target, Plus } from 'lucide-react';

const CATEGORY_ICONS = {
  Food: '🍕',
  Travel: '✈️',
  Groceries: '🛒',
  Shopping: '🛍️',
  Health: '🏥',
  Utilities: '💡',
  Entertainment: '🎬',
  Other: '📦',
};

export default function BudgetCard({ category, limitAmount, spentAmount, onEdit }) {
  const percent = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;
  
  let statusText = 'Surplus';
  let statusColor = 'text-blue-400';
  let barColor = 'bg-blue-600';

  if (percent > 100) {
    statusText = 'Critical Overrun';
    statusColor = 'text-rose-500';
    barColor = 'bg-rose-500';
  } else if (percent > 80) {
    statusText = 'High Capacity';
    statusColor = 'text-amber-500';
    barColor = 'bg-amber-500';
  } else if (percent > 0) {
    statusText = 'Optimal';
    statusColor = 'text-emerald-400';
    barColor = 'bg-emerald-400';
  }

  return (
    <div className="card !p-6 flex flex-col justify-between group h-full transition-all hover:border-slate-700">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-800 group-hover:scale-110 transition-transform">
            {CATEGORY_ICONS[category] || '💰'}
          </div>
          {limitAmount > 0 ? (
              <button 
                onClick={onEdit}
                className="text-[9px] font-black uppercase text-slate-500 hover:text-white tracking-[0.2em] border border-slate-800 px-3 py-1.5 rounded-lg transition-all"
              >
                Calibrate
              </button>
          ) : (
            <button 
                onClick={onEdit}
                className="p-2 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-900/10"
              >
                <Plus className="w-4 h-4" />
              </button>
          )}
        </div>

        <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1">{category}</h3>
        <p className={`text-[10px] font-black uppercase tracking-widest ${statusColor} opacity-80 mb-4`}>{statusText}</p>
        
        {limitAmount > 0 ? (
          <div className="space-y-4">
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900 shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                style={{ width: `${Math.min(percent, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-baseline">
                <span className="text-white font-black text-lg tracking-tighter">₹{spentAmount.toFixed(0)}</span>
                <span className="text-slate-500 font-bold text-xs">/ ₹{limitAmount.toFixed(0)}</span>
            </div>
            {percent > 100 && (
                <div className="flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 p-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5" /> Overrun by ₹{(spentAmount - limitAmount).toFixed(0)}
                </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
             <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">No target set</p>
          </div>
        )}
      </div>
    </div>
  );
}
