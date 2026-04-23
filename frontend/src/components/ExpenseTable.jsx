import React from 'react';
import { format } from 'date-fns';
import { Receipt, FileText } from 'lucide-react';

export default function ExpenseTable({ expenses, isLoading }) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 py-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-slate-100/80 rounded-xl w-full"></div>
        ))}
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Receipt className="w-12 h-12 mb-3 text-slate-300" />
        <p className="font-medium text-slate-600">No recent expenses</p>
        <p className="text-sm mt-1">Your added expenses will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
            <th className="py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Vendor / Description</th>
            <th className="py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Category</th>
            <th className="py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Payment Mode</th>
            <th className="py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors group">
              <td className="py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                {expense.date ? format(new Date(expense.date), 'MMM dd, yyyy') : 'N/A'}
              </td>
              <td className="py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border ${expense.is_manual ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-purple-50 text-purple-500 border-purple-100'}`}>
                    {expense.is_manual ? <FileText className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                  </div>
                  <span className="font-semibold text-slate-800">{expense.vendor_name || 'Unknown Vendor'}</span>
                </div>
              </td>
              <td className="py-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  {expense.category || 'Uncategorized'}
                </span>
              </td>
              <td className="py-4 text-sm text-slate-500 font-medium capitalize">
                {expense.payment_mode || 'N/A'}
              </td>
              <td className="py-4 text-right font-bold text-slate-900">
                ₹{parseFloat(expense.total_amount).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
