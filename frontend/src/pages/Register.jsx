import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, UserPlus, Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await register(email, password, fullName);
      if (error) throw error;
      showSuccess('Account provisioned. Welcome to the workspace.');
      navigate('/dashboard');
    } catch (error) {
      showError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-brand-500/30 text-slate-200">
      {/* Background Ambience */}
      <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] bg-brand-600/10 rounded-full blur-[100px] -z-10 animate-pulse delay-700"></div>

      <div className="w-full max-w-md space-y-10 relative">
        <div className="text-center space-y-4 animate-in slide-in-from-bottom-10 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl mb-2 group">
             <span className="text-4xl group-hover:scale-125 transition-transform duration-500">💳</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                Onboard <span className="text-emerald-500">Operative</span>
            </h1>
            <p className="text-slate-500 font-black uppercase text-[9px] tracking-[0.4em]">Establish your encrypted workspace</p>
          </div>
        </div>

        <div className="card space-y-8 animate-in zoom-in-95 duration-700 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Operational Name</label>
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-500 transition-colors" />
                <input 
                  type="text" 
                  required 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field !pl-16 shadow-lg shadow-black/20" 
                  placeholder="Full Name"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Primary Email</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-brand-500 transition-colors" />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field !pl-16 shadow-lg shadow-black/20" 
                  placeholder="operator@workspace.ai"
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
              className="btn-primary w-full shadow-2xl shadow-brand-600/30 group py-4 h-auto"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Request Clearance
                </>
              )}
            </button>
          </form>

          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-6">
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black px-5 py-2.5 bg-slate-950/50 rounded-full border border-white/5 uppercase tracking-widest shadow-inner">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> End-to-End Vault Encryption
             </div>
             <p className="text-sm font-medium text-slate-400">
               Already provisioned? <Link to="/login" className="text-brand-500 font-extrabold hover:text-brand-400 transition-colors underline underline-offset-4 decoration-2 ml-1 flex items-center gap-1 inline-flex"><ArrowLeft className="w-4 h-4" /> Return to Login</Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
