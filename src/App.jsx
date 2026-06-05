import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION (PASTE YOUR KEYS HERE) ---
const SUPABASE_URL = 'https://wbqnuxsdshvfxdznysyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicW51eHNkc2h2Znhkem55c3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTA4NDksImV4cCI6MjA5NjA2Njg0OX0.gZvdaAnzCN4i1zOS7LAiKjyYGF5mMoi-0-6saddTNG4';
const AI_URL = 'https://ah13med-steel-ai-api.hf.space/inspect';
// --------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [view, setView] = useState('inspect'); 
  const [role, setRole] = useState('editor'); 
  const [lang, setLang] = useState('ar');
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
      alert("AI Brain is waking up... wait 10 seconds.");
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (status, correctedSlug = null) => {
    const finalSlug = correctedSlug || result.ai_prediction;
    let { data: newDetails } = await supabase.from('defects').select('*').eq('slug', finalSlug).single();
    const { error } = await supabase.from('inspections').update({ status, final_label: finalSlug }).eq('id', result.id);
    if (!error) {
      setResult({ ...result, status, details: newDetails, ai_prediction: finalSlug });
      setIsCorrecting(false);
      fetchHistory();
    }
  };

  const t = (en, ar) => (lang === 'en' ? en : ar);

  // --- STYLES (PURE INLINE) ---
  const s = {
    page: { background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', textAlign: 'center' },
    nav: { padding: '15px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    btn: { background: '#f97316', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
    tabBtn: { flex: 1, padding: '15px', background: 'none', border: 'none', color: '#666', borderBottom: '1px solid #222', cursor: 'pointer' },
    activeTab: { flex: 1, padding: '15px', background: 'none', border: 'none', color: '#f97316', borderBottom: '2px solid #f97316', fontWeight: 'bold' },
    card: { background: '#111', margin: '20px', padding: '20px', borderRadius: '20px', border: '1px solid #222' },
    label: { background: '#111', border: '2px dashed #333', padding: '50px 20px', borderRadius: '20px', display: 'block', marginTop: '30px', cursor: 'pointer' },
    info: { background: '#000', padding: '15px', borderRadius: '15px', textAlign: lang === 'ar' ? 'right' : 'left', marginTop: '15px' }
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{fontWeight:'900', color:'#f97316'}}>STEEL PRO AI</div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} style={{background:'#222', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'5px'}}>{lang.toUpperCase()}</button>
            <div onClick={() => setRole(role==='viewer'?'editor':'viewer')} style={{fontSize:'10px', color:'#f97316', border:'1px solid #f97316', padding:'4px 8px', borderRadius:'20px'}}>
                {t(role.toUpperCase(), role === 'editor' ? 'محرر' : 'مشاهد')}
            </div>
        </div>
      </nav>

      <div style={{display:'flex'}}>
        <button onClick={() => setView('inspect')} style={view === 'inspect' ? s.activeTab : s.tabBtn}>{t('Inspect', 'فحص')}</button>
        <button onClick={() => setView('history')} style={view === 'history' ? s.activeTab : s.tabBtn}>{t('History', 'السجل')}</button>
      </div>

      <main style={{maxWidth:'500px', margin:'0 auto'}}>
        {view === 'inspect' && (
          <div>
            {!img ? (
              <label style={s.label}>
                <input type="file" capture="environment" hidden onChange={handleFile} />
                <div style={{fontSize:'40px', marginBottom:'10px'}}>📷</div>
                <div style={{fontWeight:'bold'}}>{t('START INSPECTION', 'بدء الفحص')}</div>
              </label>
            ) : (
              <div style={{padding:'20px'}}>
                <img src={img} style={{width:'100%', borderRadius:'15px', marginBottom:'15px'}} />
                {!result ? (
                  <button onClick={analyze} style={{...s.btn, width:'100%'}} disabled={loading}>
                    {loading ? '...' : t('ANALYZE', 'تحليل العينة')}
                  </button>
                ) : (
                  <div style={s.card}>
                    <h2 style={{color:'#ef4444', margin:0}}>{t(result.details?.name_en, result.details?.name_ar)}</h2>
                    <p style={{fontSize:'10px', color:'#666'}}>CONFIDENCE: {(result.confidence * 100).toFixed(1)}%</p>
                    
                    <div style={s.info}>
                        <p style={{color:'#f97316', fontSize:'10px', margin:0}}>CAUSES / الأسباب</p>
                        <p style={{fontSize:'14px', margin:'5px 0 15px 0'}}>{t(result.details?.causes_en, result.details?.causes_ar)}</p>
                        <p style={{color:'#22c55e', fontSize:'10px', margin:0}}>PREVENTION / الوقاية</p>
                        <p style={{fontSize:'14px', margin:'5px 0 0 0'}}>{t(result.details?.prevention_en, result.details?.prevention_ar)}</p>
                    </div>

                    {role === 'editor' && result.status === 'pending' && (
                        <div style={{marginTop:'20px'}}>
                            {!isCorrecting ? (
                                <div style={{display:'flex', gap:'10px'}}>
                                    <button onClick={() => updateReview('confirmed')} style={{flex:1, padding:'10px', background:'#15803d', border:'none', borderRadius:'10px', color:'#fff', fontWeight:'bold'}}>{t('Confirm', 'تأكيد')}</button>
                                    <button onClick={() => setIsCorrecting(true)} style={{flex:1, padding:'10px', background:'#b91c1c', border:'none', borderRadius:'10px', color:'#fff', fontWeight:'bold'}}>{t('Correct', 'تصحيح')}</button>
                                </div>
                            ) : (
                                <div style={{background:'#000', padding:'15px', borderRadius:'15px', border:'1px solid #333'}}>
                                    <p style={{fontSize:'10px', color:'#ef4444', marginBottom:'10px'}}>{t('SELECT CORRECT DEFECT:', 'اختر العيب الصحيح:')}</p>
                                    <div style={{maxHeight:'150px', overflowY:'auto', display:'grid', gap:'5px'}}>
                                        {defectList.map(d => (
                                            <button key={d.id} onClick={() => updateReview('corrected', d.slug)} style={{background:'#111', color:'#fff', border:'1px solid #333', padding:'8px', borderRadius:'5px', textAlign:'left', fontSize:'12px'}}>
                                                {t(d.name_en, d.name_ar)}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setIsCorrecting(false)} style={{marginTop:'10px', background:'none', border:'none', color:'#444', fontSize:'10px'}}>CANCEL</button>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={() => {setImg(null); setResult(null);}} style={{marginTop:'20px', background:'none', border:'none', color:'#444', fontSize:'12px', textDecoration:'underline'}}>{t('New Scan', 'فحص جديد')}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div style={{padding:'10px'}}>
            {history.map(item => (
              <div key={item.id} style={{background:'#111', padding:'15px', borderRadius:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #222'}}>
                <div style={{textAlign:'left'}}>
                    <div style={{fontWeight:'bold', fontSize:'14px', textTransform:'uppercase'}}>{item.final_label || item.ai_prediction}</div>
                    <div style={{fontSize:'10px', color:'#444'}}>{new Date(item.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{fontSize:'10px', color: item.status==='pending' ? '#f59e0b' : '#22c55e'}}>{item.status.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
