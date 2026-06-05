import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Upload, History, Shield, CheckCircle, XCircle, AlertTriangle, User, Languages, Database, Edit3, Save } from 'lucide-react';

// --- CONFIGURATION (Keep your keys here) ---
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
    const { data, error } = await supabase.from('inspections').select('*').order('created_at', { ascending: false });
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

      // If AI finds nothing, we use 'overlap' as a placeholder for testing
      let detectedSlug = aiData.detections?.[0]?.class.toLowerCase() || 'overlap'; 
      
      const { data: defectInfo } = await supabase.from('defects').select('*').eq('slug', detectedSlug).single();
      
      const { data: savedIns, error: insErr } = await supabase.from('inspections').insert([{
        ai_prediction: detectedSlug,
        confidence: aiData.detections?.[0]?.conf || 0.89,
        status: 'pending'
      }]).select().single();

      setResult({
        ...savedIns,
        details: defectInfo,
      });
      fetchHistory();
    } catch (err) {
      alert("AI offline - make sure your Hugging Face Space is RUNNING");
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (status, correctedSlug = null) => {
    const finalSlug = correctedSlug || result.ai_prediction;
    
    // Get the new details if corrected
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
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* HEADER */}
      <nav className="p-4 border-b border-gray-900 flex justify-between items-center sticky top-0 bg-black z-50">
        <div className="flex items-center gap-2">
          <Shield className="text-orange-500" />
          <span className="font-black text-xl tracking-tighter">STEEL<span className="text-orange-500">PRO</span></span>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="text-xs border border-gray-800 px-2 py-1 rounded">
            {lang === 'en' ? 'AR' : 'EN'}
          </button>
          <div onClick={() => setRole(role === 'viewer' ? 'editor' : 'viewer')} className="bg-gray-900 px-3 py-1 rounded-full text-[10px] cursor-pointer border border-gray-700">
             {t(role.toUpperCase(), role === 'editor' ? 'محرر' : 'مشاهد')}
          </div>
        </div>
      </nav>

      {/* VIEW SELECTOR */}
      <div className="flex border-b border-gray-900">
        <button onClick={() => setView('inspect')} className={`flex-1 p-3 text-sm flex items-center justify-center gap-2 ${view === 'inspect' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}>
          <Camera size={16}/> {t('Inspect', 'فحص')}
        </button>
        <button onClick={() => setView('history')} className={`flex-1 p-3 text-sm flex items-center justify-center gap-2 ${view === 'history' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}>
          <History size={16}/> {t('History', 'السجل')}
        </button>
      </div>

      <main className="p-6 max-w-xl mx-auto">
        {view === 'inspect' && (
          <div className="space-y-6">
            {!img ? (
              <div className="flex flex-col gap-4">
                <label className="bg-orange-600 p-8 rounded-3xl flex flex-col items-center gap-3 cursor-pointer shadow-lg shadow-orange-900/20">
                  <input type="file" capture="environment" hidden onChange={handleFile} />
                  <Camera size={40} />
                  <span className="font-bold">{t('Take Live Photo', 'تصوير عينة')}</span>
                </label>
                <label className="bg-gray-900 p-4 rounded-2xl flex items-center justify-center gap-3 border border-gray-800">
                  <input type="file" hidden onChange={handleFile} />
                  <Upload size={20} />
                  <span>{t('Upload Gallery', 'رفع من الاستوديو')}</span>
                </label>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-3xl p-4 border border-gray-800">
                <img src={img} className="w-full rounded-2xl mb-4 border border-gray-800" />
                
                {!result ? (
                  <button onClick={analyze} disabled={loading} className="w-full bg-orange-500 p-4 rounded-xl font-bold">
                    {loading ? t('Analyzing...', 'جاري التحليل...') : t('Run AI Inspection', 'بدء الفحص')}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle size={20} />
                      <h2 className="text-xl font-bold uppercase">
                        {result.details ? t(result.details.name_en, result.details.name_ar) : t('Unknown Defect', 'عيب غير معروف')}
                      </h2>
                    </div>
                    <p className="text-gray-500 text-sm">Confidence: {(result.confidence * 100).toFixed(1)}%</p>

                    <div className="bg-black/50 p-4 rounded-xl border border-gray-800 text-sm space-y-3">
                      <div>
                        <p className="text-orange-500 font-bold text-[10px] uppercase">{t('Causes', 'الأسباب')}</p>
                        <p className="text-gray-300">{result.details ? t(result.details.causes_en, result.details.causes_ar) : '---'}</p>
                      </div>
                      <div>
                        <p className="text-green-500 font-bold text-[10px] uppercase">{t('Prevention', 'الوقاية')}</p>
                        <p className="text-gray-300">{result.details ? t(result.details.prevention_en, result.details.prevention_ar) : '---'}</p>
                      </div>
                    </div>

                    {role === 'editor' && result.status === 'pending' && (
                      <div className="flex flex-col gap-2 pt-4">
                        {!isCorrecting ? (
                          <div className="flex gap-2">
                            <button onClick={() => updateReview('confirmed')} className="flex-1 bg-green-700 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold">
                              <CheckCircle size={18}/> {t('Confirm', 'تأكيد')}
                            </button>
                            <button onClick={() => setIsCorrecting(true)} className="flex-1 bg-red-700 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold">
                              <Edit3 size={18}/> {t('Correct', 'تصحيح')}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-black p-4 rounded-xl border border-red-900/50 space-y-3">
                            <p className="text-xs text-red-500 font-bold">{t('Select Real Defect:', 'اختر العيب الصحيح:')}</p>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                              {defectList.map(d => (
                                <button key={d.id} onClick={() => updateReview('corrected', d.slug)} className="text-left p-2 bg-gray-900 rounded border border-gray-800 text-xs">
                                  {t(d.name_en, d.name_ar)}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setIsCorrecting(false)} className="w-full text-[10px] text-gray-500 uppercase">{t('Cancel', 'إلغاء')}</button>
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => {setImg(null); setResult(null);}} className="w-full mt-4 text-gray-500 text-sm">{t('New Scan', 'فحص جديد')}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3">
            {history.length === 0 && <p className="text-center text-gray-600 py-10">{t('No history found', 'لا يوجد سجلات')}</p>}
            {history.map((item) => (
              <div key={item.id} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-lg"><Database size={16} className="text-orange-500"/></div>
                  <div>
                    <p className="font-bold text-sm uppercase">{item.final_label || item.ai_prediction}</p>
                    <p className="text-[10px] text-gray-600">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`text-[10px] px-2 py-1 rounded ${item.status === 'pending' ? 'bg-orange-950 text-orange-500' : 'bg-green-950 text-green-500'}`}>
                  {item.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
