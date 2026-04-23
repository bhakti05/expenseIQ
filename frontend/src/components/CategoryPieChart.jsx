import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  Food: '#f97316',
  Travel: '#3b82f6',
  Groceries: '#22c55e',
  Shopping: '#a855f7',
  Health: '#ec4899',
  Utilities: '#eab308',
  Entertainment: '#06b6d4',
  Other: '#6b7280',
};

function CategoryTooltipContent({ active, payload }) {
  if (active && payload && payload.length) {
    const payloadData = payload[0];
    const total = payloadData.payload?.total || 0;
    const percent = total > 0 ? ((payloadData.value / total) * 100).toFixed(1) : 0;

    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
        <p className="font-bold text-slate-200">{payloadData.name}</p>
        <p className="text-blue-400 font-bold mb-1">₹{payloadData.value.toFixed(2)}</p>
        <p className="text-xs text-slate-400 font-medium">{percent}% of total</p>
      </div>
    );
  }

  return null;
}

export default function CategoryPieChart({ expenses, data, hideLegend = false }) {
  const chartData = useMemo(() => {
    if (data) return data;
    if (!expenses || expenses.length === 0) return [];

    const categoryTotals = {};
    expenses.forEach((expense) => {
      const amount = parseFloat(expense.total_amount) || 0;
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + amount;
    });

    const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);

    return Object.keys(categoryTotals)
      .map((key) => ({
        name: key,
        value: categoryTotals[key],
        total,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, data]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500 font-medium">
        No expenses yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.Other} />
          ))}
        </Pie>
        <Tooltip content={<CategoryTooltipContent />} />
        {!hideLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-slate-300 font-medium ml-1 text-sm">{value}</span>}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
