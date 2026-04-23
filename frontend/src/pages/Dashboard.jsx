import React, { useState, useEffect } from 'react';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Plus, Camera, TrendingUp, AlertCircle, Wallet, Receipt, Award, ChevronUp } from 'lucide-react';
import CategoryPieChart from '../components/CategoryPieChart';
import ExpenseForm from '../components/ExpenseForm';
import { SkeletonCard } from '../components/LoadingSkeleton';
import { useToast } from '../components/Toast';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    currentMonthSum: 0,
    lastMonthSum: 0,
    totalCount: 0,
    topCategory: { name: 'N/A', amount: 0 },
    budgetStatus: { status: 'On Track', percentage: 0 }
  });
  
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: allExpenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      
      const expList = allExpenses || [];
      setExpenses(expList);

      const now = new Date();
      const currentStart = startOfMonth(now);
      const currentEnd = endOfMonth(now);
      const lastStart = startOfMonth(subMonths(now, 1));
      const lastEnd = endOfMonth(subMonths(now, 1));

      let currentSum = 0;
      let lastSum = 0;
      const categoryTotals = {};

      expList.forEach(exp => {
        const expDate = new Date(exp.date);
        const amount = parseFloat(exp.total_amount) || 0;
        
        if (expDate >= currentStart && expDate <= currentEnd) {
          currentSum += amount;
          categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amount;
        }
        
        if (expDate >= lastStart && expDate <= lastEnd) {
          lastSum += amount;
        }
      });

      let topCatName = 'N/A';
      let topCatAmount = 0;
      Object.entries(categoryTotals).forEach(([cat, amount]) => {
        if (amount > topCatAmount) {
          topCatAmount = amount;
          topCatName = cat;
        }
      });

      // Fetch actual budget if exists
      const monthKey = format(now, 'yyyy-MM');
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('limit_amount')
        .eq('user_id', user.id)
        .eq('month', monthKey);
      
      const totalBudget = budgetData?.reduce((acc, b) => acc + parseFloat(b.limit_amount), 0) || 5000;
      const budgetPercentage = totalBudget > 0 ? (currentSum / totalBudget) * 100 : 0;
      const bStatus = budgetPercentage > 100 ? 'Over Budget' : (budgetPercentage > 80 ? 'Near Limit' : 'On Track');

      setStats({
        currentMonthSum: currentSum,
        lastMonthSum: lastSum,
        totalCount: expList.length,
        topCategory: { name: topCatName, amount: topCatAmount },
        budgetStatus: { status: bStatus, percentage: Math.round(budgetPercentage) }
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (expenseData) => {
    try {
      const { error } = await supabase.from('expenses').insert([{
        ...expenseData,
        user_id: user.id
      }]);
      
      if (error) throw error;
      setShowAddForm(false);
      showSuccess('Transaction saved successfully.');
      fetchDashboardData();
    } catch (error) {
      showError(error.message || 'Error adding expense.');
      console.error("Error adding expense:", error);
    }
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'User';
  const todayStr = format(new Date(), 'EEEE, MMMM do, yyyy');
  const percentDiff = stats.lastMonthSum > 0 
    ? Math.round(((stats.currentMonthSum - stats.lastMonthSum) / stats.lastMonthSum) * 100)
    : 0;

  const chartData = Object.entries(
    expenses
      .filter(e => new Date(e.date) >= startOfMonth(new Date()))
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + parseFloat(curr.total_amount);
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-3">
            <div className="h-10 bg-slate-800 rounded-xl w-64 animate-pulse"></div>
            <div className="h-4 bg-slate-800 rounded-lg w-48 animate-pulse"></div>
          </div>
          <div className="flex gap-4">
            <div className="h-12 bg-slate-800 rounded-2xl w-32 animate-pulse"></div>
            <div className="h-12 bg-slate-800 rounded-2xl w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <SkeletonCard key={i} className="h-40" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-[500px] bg-slate-900 border border-slate-800 rounded-3xl animate-pulse"></div>
          <div className="lg:col-span-2 h-[500px] bg-slate-900 border border-slate-800 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* SECTION 1: Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Good morning, {firstName}! 👋</h1>
          <p className="text-slate-400 font-medium mt-1.5">{todayStr}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link to="/upload" className="btn-primary flex items-center gap-2">
            <Camera className="w-5 h-5 mb-0.5" />
            Scan Receipt
          </Link>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* SECTION 4: Quick Add Expense (Collapsible) */}
      {showAddForm && (
        <div className="card relative animate-in slide-in-from-top-4 duration-300">
          <button 
            onClick={() => setShowAddForm(false)}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-800 hover:text-white rounded-xl transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold text-white mb-6 tracking-tight">Quick Add Manual Expense</h3>
          <ExpenseForm onSubmit={handleExpenseSubmit} isSubmitting={false} />
        </div>
      )}

      {/* SECTION 2: Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: This Month's Spending */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 border border-blue-500/30 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3 mb-4 text-blue-100">
              <Wallet className="w-5 h-5" />
              <span className="font-bold text-[10px] uppercase tracking-widest">This Month</span>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-1 tracking-tight">₹{stats.currentMonthSum.toFixed(0)}</h2>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-black backdrop-blur-md uppercase tracking-tighter">
                <TrendingUp className="w-3 h-3" />
                <span>vs last: {percentDiff >= 0 ? '+' : ''}{percentDiff}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 border border-emerald-500/30 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3 mb-4 text-emerald-100">
              <Receipt className="w-5 h-5" />
              <span className="font-bold text-[10px] uppercase tracking-widest">Transactions</span>
            </div>
            <div>
              <h2 className="text-4xl font-black mb-1 tracking-tight">{stats.totalCount}</h2>
              <p className="text-[10px] font-black text-emerald-100/70 uppercase tracking-widest">Total entries</p>
            </div>
          </div>
        </div>

        {/* Card 3: Top Category */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-3xl p-6 border border-purple-500/30 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3 mb-4 text-purple-100">
              <Award className="w-5 h-5" />
              <span className="font-bold text-[10px] uppercase tracking-widest">Top Category</span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black mb-1 tracking-tight truncate">{stats.topCategory.name}</h2>
              <p className="text-[10px] font-black text-purple-200 bg-white/10 inline-block px-3 py-1 rounded-lg backdrop-blur-md uppercase">
                ₹{stats.topCategory.amount.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Budget Status */}
        <div className={`bg-gradient-to-br ${stats.budgetStatus.status === 'On Track' ? 'from-amber-500 to-orange-700 border-amber-500/30 shadow-orange-500/20' : 'from-rose-600 to-rose-800 border-rose-500/30 shadow-rose-500/20'} rounded-3xl p-6 border text-white shadow-xl relative overflow-hidden group`}>
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 translate-y-1/2 group-hover:bg-white/20 transition-all"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-white/80" />
              <span className="font-bold text-[10px] uppercase tracking-widest text-white/80">Monthly Status</span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black mb-1 tracking-tight">{stats.budgetStatus.status}</h2>
              <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden mb-1.5">
                 <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(stats.budgetStatus.percentage, 100)}%` }}></div>
              </div>
              <p className="text-[9px] font-black uppercase text-white/70 tracking-widest">{stats.budgetStatus.percentage}% of limit used</p>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT: Recent Expenses Table */}
        <div className="lg:col-span-3 card flex flex-col !p-0 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-bold text-white text-lg flex items-center gap-2 tracking-tight">
              <Receipt className="w-5 h-5 text-blue-500" />
              Recent Expenses
            </h3>
            <Link to="/analytics" className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors">
              View All
            </Link>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-950/30">
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Vendor</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {expenses.slice(0, 8).map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-xs text-slate-400 font-bold whitespace-nowrap uppercase tracking-tighter">
                      {expense.date ? format(new Date(expense.date), 'MMM dd') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-200">{expense.vendor_name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge badge-${expense.category?.toLowerCase() || 'other'}`}>
                        {expense.category || 'Other'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-white text-lg tracking-tight">
                      ₹{parseFloat(expense.total_amount).toFixed(0)}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                      No transaction history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Quick Pie Chart */}
        <div className="lg:col-span-2 card flex flex-col">
          <div className="mb-8">
            <h3 className="font-bold text-white text-lg flex items-center gap-2 tracking-tight">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Analysis
            </h3>
            <p className="text-slate-500 text-[10px] mt-1 font-black uppercase tracking-widest">Category distribution</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            {chartData.length > 0 ? (
              <CategoryPieChart data={chartData} />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-600 h-full w-full border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/50 p-8 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Awaiting data for analysis</p>
              </div>
            )}
          </div>
        </div>
        
      </div>

    </div>
  );
}
