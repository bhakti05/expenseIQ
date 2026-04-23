import React, { useState, useEffect } from 'react';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';
import { format, startOfWeek, startOfMonth, subMonths, startOfYear } from 'date-fns';
import { PieChart as PieIcon, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Table, AlertCircle } from 'lucide-react';
import CategoryPieChart from '../components/CategoryPieChart';
import SpendingTrendChart from '../components/SpendingTrendChart';
import { SkeletonCard, SkeletonChart } from '../components/LoadingSkeleton';

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('This Month');
  const [stats, setStats] = useState({ total: 0, avg: 0, peak: { vendor: 'N/A', amount: 0 } });

  const FILTERS = ['This Week', 'This Month', 'Last 3 Months', 'This Year'];

  useEffect(() => {
    if (user) fetchAnalyticsData();
  }, [user, filter]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      let startDate;
      const now = new Date();
      if (filter === 'This Week') startDate = startOfWeek(now);
      else if (filter === 'This Month') startDate = startOfMonth(now);
      else if (filter === 'Last 3 Months') startDate = startOfMonth(subMonths(now, 3));
      else if (filter === 'This Year') startDate = startOfYear(now);

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      const expList = data || [];
      setExpenses(expList);

      const total = expList.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);
      const avg = total / (expList.length || 1);
      const peak = expList.reduce((max, curr) => parseFloat(curr.total_amount) > max.amount ? { vendor: curr.vendor_name, amount: parseFloat(curr.total_amount) } : max, { vendor: 'N/A', amount: 0 });

      setStats({ total, avg, peak });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const chartData = Object.entries(
    expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + parseFloat(curr.total_amount);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 bg-slate-800 rounded-xl w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <SkeletonCard key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">Analytics 📊</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1.5 flex items-center gap-2 pr-4 border-r border-slate-800 shrink-0">
            Intelligent Data Visualization
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner shrink-0">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-tighter ${filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 scale-105' : 'text-slate-500 hover:text-slate-300'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card border-b-4 border-b-blue-500 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><TrendingUp className="w-6 h-6" /></div>
            <ArrowUpRight className="w-5 h-5 text-slate-800 group-hover:text-blue-500 transition-colors" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Expenditure</span>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1">₹{stats.total.toFixed(0)}</h2>
        </div>
        
        <div className="card border-b-4 border-b-indigo-500 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500"><Calendar className="w-6 h-6" /></div>
            <ArrowDownRight className="w-5 h-5 text-slate-800 group-hover:text-indigo-500 transition-colors" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Average / Transaction</span>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1">₹{stats.avg.toFixed(0)}</h2>
        </div>

        <div className="card border-b-4 border-b-rose-500 group overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500"><AlertCircle className="w-6 h-6" /></div>
            <ArrowUpRight className="w-5 h-5 text-slate-800 group-hover:text-rose-500 transition-colors" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate block">Peak Single Spend: {stats.peak.vendor}</span>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1 truncate">₹{stats.peak.amount.toFixed(0)}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800"><PieIcon className="w-5 h-5 text-blue-500" /></div>
             <div>
                <h3 className="text-lg font-black text-white tracking-tight leading-none">Category Distribution</h3>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1.5">Where your money flows</p>
             </div>
          </div>
          <div className="h-[350px]"><CategoryPieChart data={chartData} /></div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800"><TrendingUp className="w-5 h-5 text-indigo-500" /></div>
             <div>
                <h3 className="text-lg font-black text-white tracking-tight leading-none">Spending Velocity</h3>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1.5">Tracking daily momentum</p>
             </div>
          </div>
          <div className="h-[350px]"><SpendingTrendChart expenses={expenses} days={filter === 'This Week' ? 7 : filter === 'This Month' ? 30 : 90} /></div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800"><Table className="w-5 h-5 text-emerald-500" /></div>
             <h3 className="text-lg font-black text-white tracking-tight">Granular Transaction Logs</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-950/20">
                  <th className="px-8 py-5 font-black text-slate-500 text-[10px] uppercase tracking-widest">Timestamp</th>
                  <th className="px-8 py-5 font-black text-slate-500 text-[10px] uppercase tracking-widest">Recipient / Vendor</th>
                  <th className="px-8 py-5 font-black text-slate-500 text-[10px] uppercase tracking-widest">Category Classification</th>
                  <th className="px-8 py-5 font-black text-slate-500 text-[10px] uppercase tracking-widest text-right">Value (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-8 py-5 text-xs text-slate-400 font-bold uppercase tracking-tighter">{format(new Date(expense.date), 'MMMM dd, yyyy')}</td>
                    <td className="px-8 py-5"><span className="font-black text-slate-200 uppercase tracking-tight">{expense.vendor_name || 'Anonymous Receipt'}</span></td>
                    <td className="px-8 py-5"><span className={`badge badge-${expense.category?.toLowerCase()}`}>{expense.category}</span></td>
                    <td className="px-8 py-5 text-right font-black text-white text-lg tracking-tight group-hover:text-blue-400 transition-colors">₹{parseFloat(expense.total_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
