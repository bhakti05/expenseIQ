import React, { useEffect, useMemo, useState } from 'react';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import supabase, { isSupabaseConfigured, supabaseConfigError } from '../lib/supabaseClient';
import { getPredictions } from '../lib/api';
import { format, parseISO } from 'date-fns';
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BrainCircuit,
  Activity,
  RefreshCw,
} from 'lucide-react';
import ForecastChart from '../components/ForecastChart';

const modelLabels = ['LSTM', 'ARIMA'];

const buildLocalForecast = (expenses, reductionPercent) => {
  if (!expenses.length) return [];

  const recentAmounts = expenses
    .slice(-14)
    .map((expense) => parseFloat(expense.total_amount) || 0)
    .filter((amount) => Number.isFinite(amount));

  if (!recentAmounts.length) return [];

  const average = recentAmounts.reduce((sum, amount) => sum + amount, 0) / recentAmounts.length;
  const adjustedAverage = average * (1 - reductionPercent / 100);
  const lastDate = parseISO(expenses[expenses.length - 1].date);

  return Array.from({ length: 30 }, (_, index) => ({
    predicted_date: format(new Date(lastDate.getTime() + (index + 1) * 86400000), 'yyyy-MM-dd'),
    predicted_amount: Number(Math.max(0, adjustedAverage).toFixed(2)),
  }));
};

export default function Forecast() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [modelType, setModelType] = useState('LSTM');
  const [predictionsByModel, setPredictionsByModel] = useState({ LSTM: [], ARIMA: [] });
  const [simulatedReduction, setSimulatedReduction] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [forecastSource, setForecastSource] = useState('');

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage('');

    try {
      if (!isSupabaseConfigured) {
        setExpenses([]);
        setPredictionsByModel({ LSTM: [], ARIMA: [] });
        setForecastSource(supabaseConfigError);
        return;
      }

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      const expenseList = data || [];
      setExpenses(expenseList);

      if (expenseList.length < 2) {
        setPredictionsByModel({ LSTM: [], ARIMA: [] });
        setForecastSource('Add at least two expenses to generate a forecast.');
        return;
      }

      try {
        const response = await getPredictions(user.id, expenseList);
        const lstm = Array.isArray(response?.predictions) ? response.predictions : [];
        const arima = Array.isArray(response?.arima) ? response.arima : [];
        setPredictionsByModel({ LSTM: lstm, ARIMA: arima });
        setForecastSource('Using backend prediction service.');
      } catch (predictionError) {
        const fallback = buildLocalForecast(expenseList, 0);
        setPredictionsByModel({ LSTM: fallback, ARIMA: fallback });
        setForecastSource(predictionError.message || 'Using local fallback forecast.');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load forecast data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const adjustedPredictions = useMemo(() => {
    const rawPredictions = predictionsByModel[modelType] || [];
    return rawPredictions.map((item) => ({
      ...item,
      predicted_amount: Number(
        ((parseFloat(item.predicted_amount) || 0) * (1 - simulatedReduction / 100)).toFixed(2)
      ),
    }));
  }, [modelType, predictionsByModel, simulatedReduction]);

  const totalPredicted = adjustedPredictions.reduce(
    (sum, item) => sum + (parseFloat(item.predicted_amount) || 0),
    0
  );
  const highestDay = adjustedPredictions.reduce(
    (max, current) =>
      (parseFloat(current.predicted_amount) || 0) > (parseFloat(max.predicted_amount) || 0)
        ? current
        : max,
    { predicted_amount: 0, predicted_date: '' }
  );
  const confidenceScore = Math.min(
    98,
    Math.max(25, Math.round(Math.min(expenses.length, 30) / 30 * 100))
  );
  const baselineTotal = predictionsByModel[modelType]?.reduce(
    (sum, item) => sum + (parseFloat(item.predicted_amount) || 0),
    0
  ) || 0;
  const monthlySavings = Math.max(0, baselineTotal - totalPredicted);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-slate-800 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-900 border border-slate-800 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-[450px] bg-slate-900 border border-slate-800 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Predictive Forecast <span className="text-2xl">🔮</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1.5 flex items-center gap-2">
            {forecastSource || 'Forecasting from your recorded spending history'}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2 !py-2 !px-5 !text-xs !bg-slate-900 !rounded-xl"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Forecast
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-indigo-600/20 to-blue-600/10 border-indigo-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Next 30 Days</span>
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">₹{totalPredicted.toFixed(0)}</h3>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-tight">
            Estimated cumulative spending
          </p>
        </div>

        <div className="card bg-gradient-to-br from-rose-600/20 to-orange-600/10 border-rose-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Peak Day</span>
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">₹{(highestDay.predicted_amount || 0).toFixed(0)}</h3>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-tight truncate">
            {highestDay.predicted_date ? format(parseISO(highestDay.predicted_date), 'MMM dd') : 'No projection available'}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-amber-600/20 to-yellow-600/10 border-amber-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Confidence Score</span>
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">{confidenceScore}%</h3>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-tight">
            Based on {expenses.length} recorded expenses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 card !p-0 overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-black text-white text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Projection Matrix
            </h3>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {modelLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => setModelType(label)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    modelType === label
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label} Model
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 p-6">
            <ForecastChart actualExpenses={expenses} predictions={adjustedPredictions} />
          </div>
        </div>

        <div className="card flex flex-col justify-between !p-8 border-l-[6px] border-l-blue-600 bg-blue-600/5">
          <div className="space-y-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/40">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Decision Support</h3>
              <p className="text-slate-400 text-sm font-medium mt-2 leading-relaxed italic">
                Use the slider to simulate a spending cut and compare the projected monthly impact.
              </p>
            </div>
            <div className="space-y-4 pt-4 border-t border-slate-800/50">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <span>Reduction Target</span>
                <span className="text-blue-500">-{simulatedReduction}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={simulatedReduction}
                onChange={(e) => setSimulatedReduction(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-900 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex items-center gap-3 text-xs font-bold text-white bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Projected savings over 30 days: ₹{monthlySavings.toFixed(0)}</span>
              </div>
            </div>
          </div>
          <button className="flex items-center justify-center gap-2 group text-blue-500 font-black text-[10px] uppercase tracking-widest mt-8">
            Explore Mitigation Strategies <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
