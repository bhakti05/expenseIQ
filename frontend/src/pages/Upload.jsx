import React, { useState, useRef, useEffect } from 'react';
import '../index.css';
import { scanReceipt } from '../lib/api';
import ExpenseForm from '../components/ExpenseForm';
import { useAuth } from '../context/AuthContext';
import supabase, { isSupabaseConfigured, supabaseConfigError } from '../lib/supabaseClient';
import { useToast } from '../components/Toast';
import { Camera, X, Search, FileWarning, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';

export default function Upload() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [scanError, setScanError] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [successConfetti, setSuccessConfetti] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return false;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return false;
    }
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        handleFileSelection(file);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       if (validateFile(file)) {
         handleFileSelection(file);
       }
    }
  };

  const handleFileSelection = (file) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOcrResult(null);
    setScanError('');
    setShowManual(false);
    setSuccessConfetti(false);
    setScanProgress(0);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOcrResult(null);
    setScanError('');
    setScanProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const animateProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5;
      if (progress > 90) {
        clearInterval(interval);
      } else {
        setScanProgress(progress);
        if (progress < 30) setScanStatus('Preprocessing image...');
        else if (progress < 60) setScanStatus('Extracting text with OCR...');
        else if (progress <= 90) setScanStatus('Categorizing expense...');
      }
    }, 400);
    return interval;
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    setScanning(true);
    setScanError('');
    setOcrResult(null);
    const progressInterval = animateProgress();
    try {
      const result = await scanReceipt(selectedFile);
      clearInterval(progressInterval);
      setScanProgress(100);
      setScanStatus('Done!');
      setTimeout(() => {
        setOcrResult({
          vendor_name: result.vendor_name || '',
          total_amount: result.total_amount || '',
          date: result.date || '',
          category: result.category || 'Other',
          raw_ocr_text: result.raw_ocr_text || ''
        });
        setScanning(false);
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setScanning(false);
      setScanProgress(0);
      const message = err.message || 'Could not read receipt. Please try again or add manually.';
      setScanError(message);
      showError(message);
      console.error('Scan Error:', err);
    }
  };

  const handleManualSaveSuccess = () => {
    setSuccessConfetti(true);
    setTimeout(() => {
      clearSelection();
      setSuccessConfetti(false);
      setShowManual(false);
    }, 3000);
  };

  const handleExpenseSubmit = async (expenseData) => {
    if (!user) {
      setScanError('You need to be logged in before saving an expense.');
      return;
    }

    if (!isSupabaseConfigured) {
      setScanError(supabaseConfigError);
      return;
    }

    setIsSavingManual(true);
    try {
      const { error } = await supabase.from('expenses').insert([
        {
          ...expenseData,
          user_id: user.id,
        },
      ]);

      if (error) throw error;
      showSuccess('Transaction saved successfully.');
      handleManualSaveSuccess();
    } catch (error) {
      const message = error.message || 'Could not save expense.';
      setScanError(message);
      showError(message);
    } finally {
      setIsSavingManual(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          Scan Receipt 📷
        </h1>
        <p className="text-slate-400 font-medium mt-1.5">
          Upload a receipt image and we'll extract all details automatically
        </p>
      </div>

      {successConfetti && (
        <div className="bg-emerald-500 rounded-3xl p-10 text-center shadow-2xl shadow-emerald-500/20 animate-in zoom-in duration-500 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-emerald-500 mb-6 animate-bounce shadow-xl">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Expense Saved!</h2>
          <p className="text-emerald-100 font-bold uppercase text-xs tracking-widest">Financial tracker synchronized</p>
        </div>
      )}

      {!successConfetti && (
        <div className="space-y-6">
          
          {!ocrResult && !showManual && (
            <>
              <div 
                className={`
                  relative border-2 border-dashed rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center min-h-[20rem] transition-all duration-300
                  ${dragActive 
                    ? 'border-blue-500 bg-blue-500/5 backdrop-blur-sm' 
                    : previewUrl 
                      ? 'border-slate-800 bg-slate-900/50' 
                      : 'border-slate-800 bg-slate-900 hover:border-blue-500/50 hover:bg-slate-800/50 cursor-pointer shadow-xl shadow-black/20'}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !previewUrl && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleChange} 
                  accept=".jpg,.jpeg,.png,.webp" 
                  className="hidden" 
                />

                {previewUrl ? (
                  <div className="relative w-full flex flex-col items-center animate-in zoom-in duration-500">
                    <img 
                      src={previewUrl} 
                      alt="Receipt Preview" 
                      className="max-h-[400px] w-auto object-contain rounded-3xl shadow-2xl border border-slate-800 mb-6" 
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                      className="btn-secondary !py-2 !px-4 !rounded-xl !text-xs flex items-center gap-2 group"
                    >
                      <X className="w-4 h-4 text-slate-500 group-hover:text-rose-500 transition-colors" />
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="pointer-events-none flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-950 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl border border-slate-800 group-hover:scale-110 transition-transform duration-500">
                      <span className="text-5xl">📷</span>
                    </div>
                    <h3 className="font-black text-white text-2xl mb-2 tracking-tight">Drop your receipt here</h3>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] opacity-80">Supported: JPG, PNG, WEBP</p>
                  </div>
                )}
              </div>

              {scanError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 text-rose-400">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="font-bold text-sm">{scanError}</span>
                  </div>
                  <button 
                    onClick={() => setShowManual(true)}
                    className="text-rose-400 font-black text-xs uppercase tracking-widest hover:text-rose-300 flex items-center gap-1 shrink-0 transition-colors"
                  >
                    Manual Override <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {previewUrl && (
                <div className="space-y-4">
                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="btn-primary w-full !py-5 flex items-center justify-center gap-3 text-lg"
                  >
                    {scanning ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="tracking-tight">Initializing OCR pipeline...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-6 h-6" />
                        Execute AI Scan
                      </>
                    )}
                  </button>

                  {scanning && (
                    <div className="card !bg-slate-950/50 border-slate-800/50 animate-in fade-in duration-300">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                        <span>{scanStatus}</span>
                        <span className="text-blue-500">{scanProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden shadow-inner border border-slate-800/50">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                          style={{ width: `${scanProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {(ocrResult || showManual) && (
            <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6">
              
              {ocrResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4 text-emerald-400">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-lg tracking-tight">Scan Complete!</h4>
                    <p className="text-sm text-emerald-500/70 font-bold uppercase tracking-tighter">Please verify the extracted JSON data</p>
                  </div>
                </div>
              )}

              {showManual && !ocrResult && (
                 <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6 text-blue-400 font-bold flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                        <FileWarning className="w-6 h-6" />
                    </div>
                    <span>Manual entry bypass active</span>
                 </div>
              )}

              <div className="card !p-8">
                {scanError && (
                  <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">
                    {scanError}
                  </div>
                )}
                <ExpenseForm 
                    initialData={ocrResult} 
                    onSubmit={handleExpenseSubmit}
                    isSubmitting={isSavingManual}
                    onCancel={() => {
                        setShowManual(false);
                        clearSelection();
                    }} 
                />
              </div>
            </div>
          )}

          {!previewUrl && !scanning && !ocrResult && !showManual && !successConfetti && (
             <div className="text-center pt-6">
                <button 
                  onClick={() => setShowManual(true)}
                  className="text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all border-b border-slate-800 hover:border-slate-500 pb-1"
                >
                  Bypass scan & add manually
                </button>
             </div>
          )}

        </div>
      )}

    </div>
  );
}
