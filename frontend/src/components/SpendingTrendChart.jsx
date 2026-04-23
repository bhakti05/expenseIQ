import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

function SpendingTrendTooltipContent({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
        <p className="font-bold text-slate-400 mb-1">{label}</p>
        <p className="text-blue-400 font-bold text-lg">₹{payload[0].value.toFixed(2)}</p>
      </div>
    );
  }

  return null;
}

export default function SpendingTrendChart({ expenses, days = 30, data }) {
  const chartData = useMemo(() => {
    if (data) return data;
    if (!expenses) return [];

    const result = [];
    const today = new Date();
    const dayMap = {};

    for (let i = days - 1; i >= 0; i -= 1) {
      const date = subDays(today, i);
      const dateKey = format(date, 'MMM dd');
      dayMap[dateKey] = 0;
    }

    expenses.forEach((expense) => {
      if (!expense.date) return;
      const expenseDate = new Date(expense.date);
      if (expenseDate >= subDays(today, days)) {
        const dateKey = format(expenseDate, 'MMM dd');
        if (dayMap[dateKey] !== undefined) {
          dayMap[dateKey] += parseFloat(expense.total_amount) || 0;
        }
      }
    });

    Object.keys(dayMap).forEach((key) => {
      result.push({ date: key, amount: dayMap[key] });
    });

    return result;
  }, [expenses, days, data]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500 font-medium">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAmountBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis
          stroke="#64748b"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₹${value}`}
        />
        <Tooltip content={<SpendingTrendTooltipContent />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#3b82f6"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorAmountBlue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
