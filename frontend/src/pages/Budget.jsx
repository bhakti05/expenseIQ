import React, { useState, useEffect } from 'react';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';
import { useToast } from '../components/Toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Wallet, Plus, ChevronLeft, ChevronRight, X, IndianRupee, PieChart, Info, Target, TrendingUp } from 'lucide-react';
import BudgetCard from '../components/BudgetCard';

const CATEGORIES = ['Food', 'Travel', 'Groceries', 'Shopping', 'Health', 'Utilities', 'Entertainment', 'Other'];

export default function Budget() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState({ category: '', amount: '' });

  useEffect(() => {
    if (user) fetchData();
  }, [user, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(new Date(selectedMonth));
      const monthEnd = endOfMonth(new Date(selectedMonth));

      const [budgetsRes, expensesRes] = await Promise.all([
        supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', selectedMonth),
        supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', format(monthStart, 'yyyy-MM-dd')).lte('date', format(monthEnd, 'yyyy-MM-dd'))
      ]);

      setBudgets(budgetsRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleOpenModal = (category = '', amount = '') => {
    setEditBudget({ category: category || 'Food', amount: amount || '' });
    setShowModal(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    try {
        const { error } = await supabase.from('budgets').upsert({
            user_id: user.id,
            category: editBudget.category,
            limit_amount: parseFloat(editBudget.amount),
            month: selectedMonth
        }, { onConflict: 'user_id, category, month' });

        if (error) throw error;
        setShowModal(false);
        showSuccess('Budget saved successfully.');
        fetchData();
    } catch (error) {
      showError(error.message || 'Error saving budget');
    }
  };

  const totalBudgeted = budgets.reduce((acc, curr) => acc + parseFloat(curr.limit_amount), 0);
  const totalSpent = expenses.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);
  const percentUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const changeMonth = (delta) => {
    const d = new Date(selectedMonth + '-01');
    d.setMonth(d.getMonth() + delta);
    setSelectedMonth(format(d, 'yyyy-MM'));
  };

  if (loading) return (
     <div className="space-y-8 animate-pulse text-white">
        <div className="h-10 bg-slate-800 rounded-xl w-64 uppercase tracking-[0.3em] font-black">Plan Liquidity</div>
        <div className="h-40 bg-slate-900 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-900 rounded-3xl"></div>)}
        </div>
     </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
             Budget Control Center <span className="text-2xl">💰</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1.5 flex items-center gap-2">
             Resource Allocation Matrix active
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-inner">
           <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 text-slate-400 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
           <span className="font-black text-white px-4 uppercase tracking-[0.2em] text-xs shrink-0">{format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</span>
           <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-800 text-slate-400 rounded-xl transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="card bg-gradient-to-r from-slate-900 via-slate-900 to-blue-900/20 border-blue-500/20 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
         <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-4">
            <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-widest mb-2"><PieChart className="w-4 h-4" /> Comprehensive Performance</div>
               <h2 className="text-4xl font-black text-white tracking-tighter">₹{totalSpent.toFixed(0)} <span className="text-slate-600 text-xl font-bold tracking-tight">/ ₹{totalBudgeted.toFixed(0)} budgeted</span></h2>
               <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden mt-4 border border-slate-800 group shadow-inner">
                  <div className={`h-full rounded-full transition-all duration-1000 ${percentUsed > 100 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`} style={{ width: `${Math.min(percentUsed, 100)}%` }}></div>
               </div>
               <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500 mt-2">
                  <span>Usage Intensity</span>
                  <span>{percentUsed.toFixed(1)}% of total capital deployed</span>
               </div>
            </div>
            <div className="shrink-0 flex gap-4">
               <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 shadow-xl text-center min-w-[140px]">
                  <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Efficiency</p>
                  <p className="text-xl font-black text-white">{percentUsed < 100 ? 'High' : 'Low'}</p>
               </div>
               <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 shadow-xl text-center min-w-[140px]">
                  <IndianRupee className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Available</p>
                  <p className="text-xl font-black text-white">₹{Math.max(0, totalBudgeted - totalSpent).toFixed(0)}</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATEGORIES.map(cat => {
            const budget = budgets.find(b => b.category === cat);
            const spent = expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);
            return (
              <BudgetCard 
                key={cat} 
                category={cat} 
                limitAmount={budget?.limit_amount || 0} 
                spentAmount={spent} 
                onEdit={() => handleOpenModal(cat, budget?.limit_amount)}
              />
            );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 animate-in fade-in duration-300">
           <form onSubmit={handleSaveBudget} className="card w-full max-w-md !p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-500"><Target className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Set Budget</h3>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Category Calibration</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-500 hover:bg-slate-800 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Category Target</label>
                    <select value={editBudget.category} onChange={e => setEditBudget({...editBudget, category: e.target.value})} className="input-field mt-2 font-black uppercase tracking-tighter cursor-pointer">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Monthly Ceiling (INR)</label>
                    <div className="relative mt-2">
                        <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input type="number" required value={editBudget.amount} onChange={e => setEditBudget({...editBudget, amount: e.target.value})} className="input-field !pl-14 text-2xl font-black tracking-tighter placeholder:text-slate-800" placeholder="0.00" />
                    </div>
                 </div>
                 <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex gap-3 text-xs font-medium text-blue-400">
                    <Info className="w-5 h-5 shrink-0" />
                    <span>Allocating a higher budget will adjust your predictive risk score for the month.</span>
                 </div>
              </div>

              <div className="flex gap-4 mt-10">
                 <button type="button" onClick={() => setShowModal(false)} className="btn-secondary !bg-transparent !border-slate-800 flex-1 uppercase tracking-widest text-[10px] font-black">Cancel</button>
                 <button type="submit" className="btn-primary flex-1 uppercase tracking-widest text-[10px] font-black">Instantiate Budget</button>
              </div>
           </form>
        </div>
      )}

    </div>
  );
}
