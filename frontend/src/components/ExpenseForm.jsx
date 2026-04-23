import React, { useEffect, useState } from 'react';
import { Save, X, Calendar, Tag, CreditCard, PencilLine, NotebookText, IndianRupee } from 'lucide-react';

export default function ExpenseForm({ onSubmit, initialData, isSubmitting, onCancel }) {
  const [formData, setFormData] = useState({
    vendor_name: '',
    total_amount: '',
    category: 'Other',
    payment_mode: 'UPI',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((previous) => ({
        ...previous,
        ...initialData,
        date: initialData.date || previous.date,
      }));
    }
  }, [initialData]);

  const categories = ['Food', 'Travel', 'Groceries', 'Shopping', 'Health', 'Utilities', 'Entertainment', 'Other'];
  const paymentModes = ['Cash', 'Card', 'UPI', 'Net Banking'];

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) return;

    const vendorName = formData.vendor_name.trim();
    const amount = Number.parseFloat(formData.total_amount);

    if (!vendorName || !Number.isFinite(amount) || amount <= 0) return;

    onSubmit({
      ...formData,
      vendor_name: vendorName,
      total_amount: amount.toFixed(2),
    });
  };

  const inputGroupStyle = 'space-y-2';
  const labelStyle = 'text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 flex items-center gap-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={inputGroupStyle}>
          <label className={labelStyle}>
            <NotebookText className="w-3 h-3" /> Vendor Identity
          </label>
          <div className="relative group">
            <input
              type="text"
              required
              className="input-field group-focus-within:border-blue-500/50"
              placeholder="e.g. Amazon, Starbucks"
              value={formData.vendor_name}
              onChange={(event) => setFormData({ ...formData, vendor_name: event.target.value })}
            />
          </div>
        </div>

        <div className={inputGroupStyle}>
          <label className={labelStyle}>
            <IndianRupee className="w-3 h-3" /> Transaction Value
          </label>
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="input-field !pl-10 text-xl font-black tracking-tight"
              placeholder="0.00"
              value={formData.total_amount}
              onChange={(event) => setFormData({ ...formData, total_amount: event.target.value })}
            />
          </div>
        </div>

        <div className={inputGroupStyle}>
          <label className={labelStyle}>
            <Tag className="w-3 h-3" /> Classification
          </label>
          <select
            className="input-field font-bold cursor-pointer"
            value={formData.category}
            onChange={(event) => setFormData({ ...formData, category: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className={inputGroupStyle}>
          <label className={labelStyle}>
            <CreditCard className="w-3 h-3" /> Settlement Mode
          </label>
          <select
            className="input-field font-bold cursor-pointer"
            value={formData.payment_mode}
            onChange={(event) => setFormData({ ...formData, payment_mode: event.target.value })}
          >
            {paymentModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div className={inputGroupStyle}>
          <label className={labelStyle}>
            <Calendar className="w-3 h-3" /> Event Date
          </label>
          <input
            type="date"
            required
            className="input-field font-bold uppercase tracking-tighter"
            value={formData.date}
            onChange={(event) => setFormData({ ...formData, date: event.target.value })}
          />
        </div>

        <div className={inputGroupStyle}>
          <label className={labelStyle}>
            <PencilLine className="w-3 h-3" /> Extended Metadata (Optional)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Add specific details..."
            value={formData.notes || ''}
            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
          />
        </div>
      </div>

      <div className="pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row gap-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] !bg-transparent border-slate-800"
          >
            <X className="w-4 h-4" /> Abort Entry
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex-[2] flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="w-4 h-4" /> Commit Transaction
            </>
          )}
        </button>
      </div>
    </form>
  );
}
