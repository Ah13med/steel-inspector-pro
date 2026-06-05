import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Upload, History, Shield, CheckCircle, AlertTriangle, User, Database, Edit3, X } from 'lucide-react';

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
      
      // AI fallback if no defect detected
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
      alert("AI offline - check Hugging Face Space");
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
    const { error } = await supabase.from('inspections').update({ status, final_label: finalSlug }).eq('id', result.id);
    if (!error) {
      setResult({ ...result, status, details: newDetails, ai_prediction: finalSlug });
      setIsCorrecting(false);
      fetchHistory();
    }
  };

  const t = (en, ar) => (lang === 'en' ? en : ar);

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <nav style={styles.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield color="#f97316" size={24} />
          <span style={{ fontWeight: '900', fontSize: '18px' }}>STEEL<span style={{color:'#f97316'}}>PRO</span></span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} style={styles.smBtn}>{lang.toUpperCase()}</button>
          <div onClick={() => setRole(role === 'viewer' ? 'editor' : 'viewer')} style={styles.roleTag}>
             {t(role.toUpperCase(), role === 'editor' ? 'محرر' : 'مشاهد')}
          </div>
        </div>
      </nav>

      {/* TABS */}
      <div style={styles.tabs}>
        <button onClick={() => setView('inspect')} style={view === 'inspect' ? styles.activeTab : styles.tab}>
          <Camera size={16}/> {t('Inspect', 'فحص')}
        </button>
        <button onClick={() => setView('history')} style={view === 'history' ? styles.activeTab : styles.tab}>
          <History size={16}/> {t('History', 'السجل')}
        </button>
      </div>

      <main style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        {view === 'inspect' && (
          <div>
            {!img ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '40px' }}>
                <label style={styles.mainUpload}>
                  <input type="file" capture="environment" hidden onChange={handleFile} />
                  <Camera size={40} />
                  <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{t('TAKE PHOTO', 'تصوير عينة')}</span>
                </label>
                <label style={styles.subUpload}>
                  <input type="file" hidden onChange={handleFile} />
                  <Upload size={18} />
                  <span>{t('Upload Gallery', 'رفع من الاستوديو')}</span>
                </label>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <img src={img} style={{ width: '100%', borderRadius: '20px', border: '1px solid #333' }} />
                  <button onClick={() => setImg(null)} style={styles.closeBtn}><X size={18}/></button>
                </div>
                
                {!result ? (
                  <button onClick={analyze} disabled={loading} style={styles.actionBtn}>
                    {loading ? t('Analyzing...', 'جاري التحليل...') : t('START AI SCAN', 'بدء الفحص')}
                  </button>
                ) : (
                  <div style={styles.resultCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '5px' }}>
                      <AlertTriangle size={20} />
                      <h2 style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {result.details ? t(result.details.name_en, result.details.name_ar) : t('No Defect Detected', 'لم يتم العثور على عيب')}
                      </h2>
                    </div>
                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '15px' }}>Confidence: {(result.confidence * 100).toFixed(1)}%</p>

                    <div style={styles.infoBox}>
                      <p style={{ color: '#f97316', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>{t('CAUSES', 'الأسباب')}</p>
                      <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '12px' }}>{result.details ? t(result.details.causes_en, result.details.causes_ar) : '---'}</p>
                      <p style={{ color: '#22c55e', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>{t('PREVENTION', 'الوقاية')}</p>
                      <p style={{ color: '#ccc', fontSize: '14px' }}>{result.details ? t(result.details.prevention_en, result.details.prevention_ar) : '---'}</p>
                    </div>

                    {role === 'editor' && result.status === 'pending' && (
                      <div style={{ marginTop: '20px' }}>
                        {!isCorrecting ? (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => updateReview('confirmed')} style={styles.confirmBtn}><CheckCircle size={16}/> {t('Confirm', 'تأكيد')}</button>
                            <button onClick={() => setIsCorrecting(true)} style={styles.correctBtn}><Edit3 size={16}/> {t('Correct', 'تصحيح')}</button>
                          </div>
                        ) : (
                          <div style={styles.correctionMenu}>
                            <p style={{ fontSize: '11px', color: '#ef4444', marginBottom: '10px', textAlign: 'center' }}>{t('SELECT CORRECT DEFECT:', 'اختر العيب الصحيح:')}</p>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                              {defectList.map(d => (
                                <button key={d.id} onClick={() => updateReview('corrected', d.slug)} style={styles.defectBtn}>
                                  {t(d.name_en, d.name_ar)}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setIsCorrecting(false)} style={{ width: '100%', marginTop: '10px', color: '#555', fontSize: '10px', border: 'none', background: 'none' }}>CANCEL</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div style={{ display: 'grid', gap: '10px' }}>
            {history.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: '#444' }}>{t('No history', 'لا يوجد سجلات')}</p>}
            {history.map(item => (
              <div key={item.id} style={styles.historyItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Database size={16} color="#f97316"/>
                  <div>
                    <p style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>{item.final_label || item.ai_prediction}</p>
                    <p style={{ fontSize: '10px', color: '#444' }}>{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: item.status === 'pending' ? '#f59e0b' : '#22c55e' }}>{item.status.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { background: '#050505', color: '#eee', minHeight: '100vh', fontFamily: 'sans-serif' },
  nav: { padding: '15px 20px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080808' },
  smBtn: { background: '#111', border: '1px solid #222', color: '#fff', fontSize: '10px', padding: '4px 8px', borderRadius: '4px' },
  roleTag: { background: '#f9731611', border: '1px solid #f9731633', color: '#f97316', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' },
  tabs: { display: 'flex', borderBottom: '1px solid #111', background: '#080808' },
  tab: { flex: 1, padding: '15px', background: 'none', border: 'none', color: '#555', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  activeTab: { flex: 1, padding: '15px', background: 'none', borderBottom: '2px solid #f97316', color: '#f97316', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  mainUpload: { background: '#f97316', color: '#000', padding: '40px', borderRadius: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: '0 10px 30px #f9731611' },
  subUpload: { background: '#111', border: '1px solid #222', color: '#fff', padding: '15px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' },
  closeBtn: { position: 'absolute', top: '10px', right: '10px', background: '#000000aa', border: 'none', color: '#fff', borderRadius: '50%', padding: '5px' },
  actionBtn: { width: '100%', background: '#f97316', color: '#000', padding: '18px', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px' },
  resultCard: { background: '#0a0a0a', border: '1px solid #151515', padding: '20px', borderRadius: '25px' },
  infoBox: { background: '#000', padding: '15px', borderRadius: '15px', border: '1px solid #111' },
  confirmBtn: { flex: 1, background: '#15803d', color: '#fff', padding: '12px', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
  correctBtn: { flex: 1, background: '#b91c1c', color: '#fff', padding: '12px', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
  correctionMenu: { background: '#000', border: '1px solid #b91c1c33', padding: '15px', borderRadius: '20px' },
  defectBtn: { background: '#0a0a0a', border: '1px solid #222', color: '#fff', padding: '10px', borderRadius: '8px', textAlign: 'left', fontSize: '12px' },
  historyItem: { background: '#0a0a0a', border: '1px solid #151515', padding: '15px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
};
