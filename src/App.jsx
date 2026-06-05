import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Upload, History, Shield, CheckCircle, XCircle, AlertTriangle, User, Languages, Database, Edit3, Save, Search } from 'lucide-react';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://wbqnuxsdshvfxdznysyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicW51eHNkc2h2Znhkem55c3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTA4NDksImV4cCI6MjA5NjA2Njg0OX0.gZvdaAnzCN4i1zOS7LAiKjyYGF5mMoi-0-6saddTNG4';
const AI_URL = 'https://ah13med-steel-ai-api.hf.space/inspect';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [view, setView] = useState('inspect'); 
  const [role, setRole] = useState('editor'); 
  const [lang, setLang] = useState('en');
  const [img, setImg] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [defectList, setDefectList] = useState([]);
  const [isCorrecting, setIsCorrecting] = useState(false);

  useEffect(() => { 
    fetchHistory(); 
    fetchDefects();
  }, []);

  const fetchDefects = async () => {
    const { data } = await supabase.from('defects').select('*');
    if (data) setDefectList(data);
  };

  const fetchHistory = async () => {
    const { data } = await supabase.from('inspections').select('*').order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setImg(URL.createObjectURL(f));
      setResult(null);
      setIsCorrecting(false);
    }
  };

  const analyze = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const response = await fetch(AI_URL, { method: 'POST', body: fd });
      const aiData = await response.json();

      // If AI finds nothing, we set a default to allow the Editor to "Correct" it
      let detectedSlug = aiData.detections?.[0]?.class.toLowerCase() || 'unknown'; 
      
      const { data: defectInfo } = await supabase.from('defects').select('*').eq('slug', detectedSlug).single();
      
      const { data: savedIns } = await supabase.from('inspections').insert([{
        ai_prediction: detectedSlug,
        confidence: aiData.detections?.[0]?.conf || 0.0,
        status: 'pending'
      }]).select().single();

      setResult({ ...savedIns, details: defectInfo });
      fetchHistory();
    } catch (err) {
      alert("AI offline - using simulation for UI testing");
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (status, correctedSlug = null) => {
    const finalSlug = correctedSlug || result.ai_prediction;
    
    let newDetails = result.details;
    if (correctedSlug) {
        const { data } = await supabase.from('defects').select('*').eq('slug', correctedSlug).single();
        newDetails = data;
    }

    const { error } = await supabase.from('inspections').update({
      status: status,
      final_label: finalSlug
    }).eq('id', result.id);

    if (!error) {
      setResult({ ...result, status: status, details: newDetails, ai_prediction: finalSlug });
      setIsCorrecting(false);
      fetchHistory();
    }
  };

  const t = (en, ar) => (lang === 'en' ? en : ar);

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-orange-500/30">
      {/* TOP NAVIGATION */}
      <nav className="p-4 border-b border-white/5 flex justify-between items-center sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-1.5 rounded-lg"><Shield size={20} color="black" /></div>
          <span className="font-black text-lg tracking-tight uppercase">Steel<span className="text-orange-500">Inspect</span></span>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded-md text-xs font-bold transition-all">
            {lang === 'en' ? 'AR' : 'EN'}
          </button>
          <div onClick={() => setRole(role === 'viewer' ? 'editor' : 'viewer')} className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-black cursor-pointer hover:bg-orange-500/20 transition-all">
             {t(role.toUpperCase(), role === 'editor' ? 'محرر' : 'مشاهد')}
          </div>
        </div>
      </nav>

      {/* SUB NAV TABS */}
      <div className="flex bg-white/5 border-b border-white/5">
        <button onClick={() => setView('inspect')} className={`flex-1 p-4 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${view === 'inspect' ? 'text-orange-500 bg-orange-500/5 border-b-2 border-orange-500' : 'text-gray-500'}`}>
          <Camera size={14}/> {t('Inspect', 'فحص')}
        </button>
        <button onClick={() => setView('history')} className={`flex-1 p-4 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${view === 'history' ? 'text-orange-500 bg-orange-500/5 border-b-2 border-orange-500' : 'text-gray-500'}`}>
          <History size={14}/> {t('History', 'السجل')}
        </button>
      </div>

      <main className="p-6 max-w-lg mx-auto">
        {view === 'inspect' && (
          <div className="space-y-6">
            {!img ? (
              <div className="flex flex-col gap-4 py-10">
                <label className="group bg-orange-500 hover:bg-orange-600 p-12 rounded-[2.5rem] flex flex-col items-center gap-4 cursor-pointer transition-all active:scale-95 shadow-2xl shadow-orange-500/20">
                  <input type="file" capture="environment" hidden onChange={handleFile} />
                  <Camera size={48} className="group-hover:scale-110 transition-transform" />
                  <span className="font-black text-xl uppercase tracking-widest">{t('Live Camera', 'الكاميرا')}</span>
                </label>
                <label className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl flex items-center justify-center gap-3 border border-white/10 cursor-pointer transition-all">
                  <input type="file" hidden onChange={handleFile} />
                  <Upload size={20} className="text-orange-500" />
                  <span className="text-sm font-bold">{t('Upload from Gallery', 'رفع من الاستوديو')}</span>
                </label>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className="relative group mb-6">
                    <img src={img} className="w-full rounded-[2rem] border border-white/10 shadow-2xl" />
                    <button onClick={() => setImg(null)} className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10">✕</button>
                </div>
                
                {!result ? (
                  <button onClick={analyze} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-800 p-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 transition-all">
                    {loading ? <span className="animate-pulse">{t('Analyzing Surface...', 'جاري المسح...')}</span> : t('Start AI Analysis', 'بدء التحليل')}
                  </button>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                            <h2 className="text-2xl font-black uppercase text-red-500 tracking-tighter">
                                {result.details ? t(result.details.name_en, result.details.name_ar) : t('No Defect Found', 'لم يتم العثور على عيوب')}
                            </h2>
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Confidence: {(result.confidence * 100).toFixed(1)}%</p>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-orange-500 font-black text-[10px] uppercase mb-1 tracking-widest">{t('Root Causes', 'الأسباب')}</p>
                                <p className="text-gray-300 text-sm leading-relaxed">{result.details ? t(result.details.causes_en, result.details.causes_ar) : 'Surface appears normal.'}</p>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-green-500 font-black text-[10px] uppercase mb-1 tracking-widest">{t('Prevention', 'الوقاية')}</p>
                                <p className="text-gray-300 text-sm leading-relaxed">{result.details ? t(result.details.prevention_en, result.details.prevention_ar) : 'Regular maintenance.'}</p>
                            </div>
                        </div>

                        {role === 'editor' && result.status === 'pending' && (
                        <div className="mt-6 flex flex-col gap-3">
                            {!isCorrecting ? (
                            <div className="flex gap-3">
                                <button onClick={() => updateReview('confirmed')} className="flex-1 bg-green-600 hover:bg-green-700 p-4 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all">
                                <CheckCircle size={18}/> {t('Confirm', 'تأكيد')}
                                </button>
                                <button onClick={() => setIsCorrecting(true)} className="flex-1 bg-red-600 hover:bg-red-700 p-4 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all">
                                <Edit3 size={18}/> {t('Correct', 'تصحيح')}
                                </button>
                            </div>
                            ) : (
                            <div className="bg-black/60 p-5 rounded-2xl border-2 border-red-500/30 animate-in zoom-in-95">
                                <p className="text-[10px] text-red-500 font-black uppercase mb-4 tracking-tighter text-center">{t('Select Correct Classification:', 'اختر التصنيف الصحيح:')}</p>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {defectList.map(d => (
                                    <button key={d.id} onClick={() => updateReview('corrected', d.slug)} className="text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-xs font-bold transition-colors">
                                    {t(d.name_en, d.name_ar)}
                                    </button>
                                ))}
                                </div>
                                <button onClick={() => setIsCorrecting(false)} className="w-full mt-4 text-[10px] text-gray-500 font-bold uppercase hover:text-white transition-colors">{t('Cancel', 'إلغاء')}</button>
                            </div>
                            )}
                        </div>
                        )}
                        <button onClick={() => {setImg(null); setResult(null);}} className="w-full mt-6 text-gray-600 hover:text-orange-500 text-[10px] font-black uppercase tracking-widest transition-colors">{t('Dismiss & New Scan', 'إغلاق ومسح جديد')}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3 animate-in slide-in-from-right-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">{t('Previous Inspections', 'سجل الفحوصات السابقة')}</h3>
            {history.length === 0 && <div className="py-20 text-center text-gray-700 font-bold uppercase text-xs tracking-widest">{t('No records found', 'لا توجد بيانات')}</div>}
            {history.map((item) => (
              <div key={item.id} className="group bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-white/[0.07] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-white/5 group-hover:border-orange-500/30 transition-colors">
                    <Database size={16} className="text-orange-500"/>
                  </div>
                  <div>
                    <p className="font-black text-xs uppercase tracking-tight">{item.final_label || item.ai_prediction}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase">{new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${item.status === 'pending' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
