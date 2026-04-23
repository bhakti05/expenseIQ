import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import supabase, { isSupabaseConfigured, supabaseConfigError } from '../lib/supabaseClient';
import askGroq, { canUseGroq } from '../lib/groqClient';
import { startOfMonth, subMonths, parseISO } from 'date-fns';
import {
  Bot,
  Sparkles,
  Send,
  FileText,
  AlertCircle,
  PiggyBank,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { SkeletonCard } from '../components/LoadingSkeleton';

const buildLocalInsights = (data) => {
  if (!data || data.transactionCount === 0) {
    return [
      {
        type: 'advice',
        title: 'Welcome!',
        message: 'Start adding expenses so I can generate personalized insights for you.',
      },
    ];
  }

  const [topCategoryName, topCategoryValue] = data.topCategories[0] || ['Other', 0];
  const monthChange = data.lastMonthTotal > 0
    ? ((data.thisMonthTotal - data.lastMonthTotal) / data.lastMonthTotal) * 100
    : 0;

  return [
    {
      type: monthChange > 15 ? 'alert' : 'advice',
      title: monthChange > 15 ? 'Spending Acceleration' : 'Month On Track',
      message:
        monthChange > 15
          ? `Your spending is up ${monthChange.toFixed(0)}% versus last month. Review recent large purchases before the month closes.`
          : 'Your monthly spend is stable compared with the previous month.',
    },
    {
      type: 'saving',
      title: 'Top Category Focus',
      message: `${topCategoryName} is your highest category at ₹${topCategoryValue.toFixed(0)} this month. Small cuts there will have the biggest impact.`,
    },
    {
      type: 'advice',
      title: 'Largest Expense',
      message: `Your biggest recent expense was ₹${data.biggestExpenseAmount.toFixed(0)} at ${data.biggestExpenseVendor}. Use it as a benchmark for future discretionary spending.`,
    },
  ];
};

const buildLocalReply = (question, data) => {
  const q = question.toLowerCase();
  if (!data || data.transactionCount === 0) {
    return 'Abhi tak enough expense data nahi hai. Kuch entries add karo, phir main targeted advice de sakta hoon.';
  }

  const [topCategoryName, topCategoryValue] = data.topCategories[0] || ['Other', 0];

  if (q.includes('save') || q.includes('budget')) {
    return `Sabse pehle ${topCategoryName} category ko optimize karo, jahan tum ₹${topCategoryValue.toFixed(0)} spend kar rahe ho. Weekly cap set karo aur large one-off purchases ko pre-plan karo.`;
  }

  if (q.includes('food')) {
    const foodSpend = data.topCategories.find(([name]) => name?.toLowerCase() === 'food')?.[1] || 0;
    return foodSpend > 0
      ? `Food par iss month ₹${foodSpend.toFixed(0)} gaya hai. Agar tum 10-15% cut kar do to noticeable monthly savings aa sakti hain.`
      : 'Food category mein abhi meaningful spend record nahi mila.';
  }

  return `Is month tumne ₹${data.thisMonthTotal.toFixed(0)} spend kiya hai across ${data.transactionCount} transactions. Top focus ${topCategoryName} hai, aur biggest expense ₹${data.biggestExpenseAmount.toFixed(0)} tha ${data.biggestExpenseVendor} par.`;
};

export default function AIAdvisor() {
  const { user } = useAuth();
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insights, setInsights] = useState([]);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your AI Financial Advisor. Tell me what you need help analyzing or planning today.' },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [userContext, setUserContext] = useState('');
  const [expenseSnapshot, setExpenseSnapshot] = useState(null);

  const suggestedQuestions = useMemo(
    () => [
      'How can I save more money?',
      'Am I spending too much on food?',
      'Give me a budget plan',
      'What are my worst spending habits?',
    ],
    []
  );

  useEffect(() => {
    if (user) generateInitialInsights();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getExpenseData = async () => {
    if (!isSupabaseConfigured) {
      setUserContext(supabaseConfigError);
      return null;
    }

    const thisMonthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const { data: expenses, error } = await supabase.from('expenses').select('*').eq('user_id', user.id);
    if (error || !expenses) return null;

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    let biggestExpenseAmount = 0;
    let biggestExpenseVendor = 'Unknown';
    let transactionCount = 0;
    const catMap = {};

    expenses.forEach((expense) => {
      const amount = parseFloat(expense.total_amount) || 0;
      const dateObject = parseISO(expense.date);
      if (dateObject >= thisMonthStart) {
        thisMonthTotal += amount;
        transactionCount += 1;
        catMap[expense.category] = (catMap[expense.category] || 0) + amount;
        if (amount > biggestExpenseAmount) {
          biggestExpenseAmount = amount;
          biggestExpenseVendor = expense.vendor_name || 'Unknown';
        }
      } else if (dateObject >= lastMonthStart && dateObject < thisMonthStart) {
        lastMonthTotal += amount;
      }
    });

    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topCatString = topCategories.map(([name, amount]) => `${name}: ₹${amount.toFixed(0)}`).join(', ');
    const contextString = `Total spent this month: ₹${thisMonthTotal.toFixed(0)}. Top categories: ${topCatString || 'None'}. Number of transactions: ${transactionCount}. Biggest single expense: ₹${biggestExpenseAmount.toFixed(0)} at ${biggestExpenseVendor}. Last month total: ₹${lastMonthTotal.toFixed(0)}.`;

    setUserContext(contextString);

    return {
      thisMonthTotal,
      topCategories,
      transactionCount,
      biggestExpenseAmount,
      biggestExpenseVendor,
      lastMonthTotal,
      contextString,
    };
  };

  const generateInitialInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await getExpenseData();
      setExpenseSnapshot(data);

      if (!data || data.transactionCount === 0) {
        setInsights(buildLocalInsights(data));
        return;
      }

      if (!canUseGroq()) {
        setInsights(buildLocalInsights(data));
        return;
      }

      const prompt = `You are a personal finance advisor. Analyze this data and give exactly 3 insights in JSON. Data: Month Total ₹${data.thisMonthTotal.toFixed(0)}, Categories: ${data.topCategories.map((c) => c[0]).join(', ')}, Count: ${data.transactionCount}. Return ONLY JSON array of 3 objects: { "type": "alert"|"saving"|"advice", "title": "string", "message": "string" }`;
      const responseText = await askGroq(prompt);
      const jsonStr = responseText.trim().replace(/```json|```/g, '');
      const parsedInsights = JSON.parse(jsonStr.trim());
      setInsights(Array.isArray(parsedInsights) ? parsedInsights : buildLocalInsights(data));
    } catch {
      setInsights(buildLocalInsights(expenseSnapshot));
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSendMessage = async (event, directMessage = null) => {
    if (event) event.preventDefault();
    const message = directMessage || inputMessage;
    if (!message.trim() || isTyping) return;

    setInputMessage('');
    const newMessages = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      let reply;
      if (canUseGroq()) {
        const prompt = `Assistant context: ${userContext}. Question: ${message}`;
        reply = await askGroq(prompt);
      } else {
        reply = buildLocalReply(message, expenseSnapshot);
      }

      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: buildLocalReply(message, expenseSnapshot) },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    setReportData(null);

    try {
      const data = expenseSnapshot || (await getExpenseData());
      if (!data) {
        setReportData({
          rating: 'C',
          summary: 'Connect Supabase and add expense history to generate a more accurate report.',
          recommendations: ['Configure Supabase credentials', 'Add some expense entries', 'Retry the audit'],
        });
        return;
      }

      if (!canUseGroq()) {
        const [topCategoryName] = data.topCategories[0] || ['Other'];
        setReportData({
          rating: data.thisMonthTotal > data.lastMonthTotal ? 'B' : 'A',
          summary: `This month you have spent ₹${data.thisMonthTotal.toFixed(0)} across ${data.transactionCount} transactions. ${topCategoryName} needs the closest monitoring.`,
          recommendations: [
            `Set a tighter cap for ${topCategoryName}.`,
            'Review your three biggest transactions before the next month starts.',
            'Compare weekly spending every Sunday to catch spikes early.',
          ],
        });
        return;
      }

      const prompt = `Analyze data: ₹${data.thisMonthTotal.toFixed(0)}. Return JSON: { "rating": "A"|"B"|"C"|"D", "summary": "string", "recommendations": ["str"] }`;
      const responseText = await askGroq(prompt);
      setReportData(JSON.parse(responseText.trim().replace(/```json|```/g, '')));
    } catch {
      setReportData({
        rating: 'C',
        summary: 'The AI report could not be generated right now, so a safe fallback summary is shown instead.',
        recommendations: [
          'Check your backend and Groq configuration.',
          'Retry after confirming environment variables.',
          'Keep entering recent expenses to improve recommendations.',
        ],
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-6 !p-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            AI Financial Advisor <span className="text-2xl animate-bounce duration-[2000ms]">🤖</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            {canUseGroq() ? 'Live Groq guidance enabled' : 'Local fallback advisor enabled'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loadingInsights
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} className="h-44" />)
          : insights.map((insight, index) => (
              <div
                key={index}
                className={`card border-l-[6px] flex items-start gap-4 transition-transform hover:scale-[1.02] duration-300 ${
                  insight.type === 'alert'
                    ? 'border-l-rose-500 bg-rose-500/5'
                    : insight.type === 'saving'
                    ? 'border-l-emerald-500 bg-emerald-500/5'
                    : 'border-l-blue-500 bg-blue-500/5'
                }`}
              >
                <div className="shrink-0 bg-slate-950 p-3 rounded-2xl shadow-inner">
                  {insight.type === 'alert' ? (
                    <AlertCircle className="w-6 h-6 text-rose-500" />
                  ) : insight.type === 'saving' ? (
                    <PiggyBank className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Lightbulb className="w-6 h-6 text-blue-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-black text-lg tracking-tight mb-1">{insight.title}</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">{insight.message}</p>
                </div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card !p-0 overflow-hidden h-[650px] flex flex-col">
          <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-black tracking-tight">AI Assistant</h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/30">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-[1.5rem] px-5 py-3.5 text-sm font-bold leading-relaxed shadow-xl ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="animate-pulse flex gap-2 p-4 bg-slate-800/50 rounded-2xl w-20 justify-center">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-6 border-t border-slate-800 bg-slate-950/50">
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSendMessage(null, question)}
                  className="shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white border border-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {question}
                </button>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Query the financial oracle..."
                className="input-field !py-5 !pr-16 font-bold"
              />
              <button
                type="submit"
                className="absolute right-3 p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <div className="card flex flex-col !p-8 h-[650px]">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">Financial Audit</h3>
          </div>
          {!reportData ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-6">
              <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800 shadow-inner group">
                <Sparkles className="w-10 h-10 text-slate-800 group-hover:text-amber-500 transition-colors duration-500" />
              </div>
              <button
                onClick={generateReport}
                disabled={generatingReport}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {generatingReport ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Generate Audit Report
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="flex items-center justify-between bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner relative overflow-hidden">
                <span className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Monthly Grade</span>
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-3xl shadow-2xl animate-in zoom-in duration-700 ${
                    reportData.rating === 'A' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'
                  }`}
                >
                  {reportData.rating}
                </div>
              </div>
              <p className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 text-slate-300 text-sm font-medium leading-relaxed italic">
                "{reportData.summary}"
              </p>
              <div className="flex-1 space-y-3">
                <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Lightbulb className="w-4 h-4" /> Recommendations
                </h4>
                {(reportData.recommendations || []).map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-bold text-slate-400 bg-gradient-to-r from-slate-900 to-slate-950"
                  >
                    <span className="text-blue-500 font-black opacity-50">#0{index + 1}</span> {recommendation}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setReportData(null)}
                className="btn-secondary w-full !text-xs !py-4 uppercase tracking-[0.3em] font-black"
              >
                Reset Audit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
