import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) throw error;
      showSuccess('Access Granted. Welcome back.');
      navigate('/dashboard');
    } catch (error) {
      showError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-brand-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] -z-10 animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 -z-20"></div>

      <div className="w-full max-w-md space-y-12 relative">
        {/* Branding Area */}
        <div className="text-center space-y-6 animate-in slide-in-from-top-10 duration-1000">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(14,165,233,0.15)] mb-2 group transition-all hover:scale-110">
             <span className="text-5xl group-hover:rotate-12 transition-transform duration-500">💼</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
                EXPENSE<span className="text-brand-500 italic">IQ</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.5em] px-4">
                Neural Expenditure Management System
            </p>
          </div>
        </div>

        {/* Auth Page: The actual form card */}
        <div className="card space-y-8 animate-in zoom-in-95 duration-700 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">System Login</h2>
            <p className="text-slate-500 font-medium text-sm">Provide your secure identity vector to proceed.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Identity (Email)</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-500 transition-colors" />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field !pl-16 shadow-lg shadow-black/20" 
                  placeholder="operator@expense-iq.ai"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Security Key</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-500 transition-colors" />
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field !pl-16 shadow-lg shadow-black/20" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full shadow-2xl shadow-brand-600/30 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  Initiate Connection
                </>
              )}
            </button>
          </form>

          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-6">
             <div className="flex items-center gap-2 text-slate-500 text-[9px] font-black px-4 py-2 bg-slate-950/50 rounded-full border border-white/5 uppercase tracking-widest shadow-inner">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-500" /> AES-256 Quantum Protection Active
             </div>
             <p className="text-sm font-medium text-slate-400">
               New operative? <Link to="/register" className="text-brand-500 font-extrabold hover:text-brand-400 transition-colors underline underline-offset-4 decoration-2 ml-1 flex items-center gap-1 inline-flex">Establish Account <ArrowRight className="w-4 h-4" /></Link>
             </p>
          </div>
        </div>
        
        {/* Modern Footer Metrics */}
        <div className="flex justify-center gap-8 text-slate-800 animate-in fade-in duration-1000 delay-500">
           <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"><Sparkles className="w-3 h-3 text-amber-500 opacity-50" /> AI-Insight 3.0</div>
           <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"><Sparkles className="w-3 h-3 text-brand-500 opacity-50" /> Hybrid-Cloud</div>
           <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"><Sparkles className="w-3 h-3 text-emerald-500 opacity-50" /> OCR-Pipeline</div>
        </div>
      </div>
    </div>
  );
}
