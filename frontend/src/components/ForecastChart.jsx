import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';

function ForecastTooltipContent({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
        <p className="font-bold text-slate-400 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 font-medium capitalize">{entry.name}</span>
            </div>
            <span className="font-bold text-white">₹{entry.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default function ForecastChart({ actualExpenses = [], actual = [], predictions = [] }) {
  const chartData = useMemo(() => {
    const dataMap = {};
    const normalizedActualExpenses = actualExpenses.length ? actualExpenses : actual;

    normalizedActualExpenses.forEach((expense) => {
      if (!expense.date) return;
      const formattedDate = format(parseISO(expense.date), 'MMM dd');
      if (!dataMap[formattedDate]) {
        dataMap[formattedDate] = { date: formattedDate, actual: 0, forecast: null, fullDate: expense.date };
      }
      dataMap[formattedDate].actual += parseFloat(expense.total_amount) || 0;
    });

    predictions.forEach((prediction) => {
      if (!prediction.predicted_date) return;
      const formattedDate = format(parseISO(prediction.predicted_date), 'MMM dd');
      if (!dataMap[formattedDate]) {
        dataMap[formattedDate] = {
          date: formattedDate,
          actual: null,
          forecast: 0,
          fullDate: prediction.predicted_date,
        };
      }
      dataMap[formattedDate].forecast += parseFloat(prediction.predicted_amount) || 0;
    });

    return Object.values(dataMap).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  }, [actualExpenses, actual, predictions]);

  const splitPoint = chartData.find((item) => item.forecast !== null && item.actual === null)?.date;

  if (chartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500 font-medium">
        No forecast data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
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
        <Tooltip content={<ForecastTooltipContent />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          formatter={(value) => <span className="text-slate-300 font-bold ml-1 text-sm">{value}</span>}
        />
        {splitPoint && (
          <ReferenceLine
            x={splitPoint}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{ position: 'top', value: 'Prediction', fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
          />
        )}
        <Line
          type="monotone"
          name="Actual"
          dataKey="actual"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
          connectNulls
        />
        <Line
          type="monotone"
          name="Forecast"
          dataKey="forecast"
          stroke="#f97316"
          strokeWidth={3}
          strokeDasharray="5 5"
          dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
