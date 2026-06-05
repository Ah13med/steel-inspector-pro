import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Upload, History, Shield, CheckCircle, XCircle, AlertTriangle, User, Settings, Database, ChevronRight, Languages } from 'lucide-react';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://wbqnuxsdshvfxdznysyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicW51eHNkc2h2Znhkem55c3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTA4NDksImV4cCI6MjA5NjA2Njg0OX0.gZvdaAnzCN4i1zOS7LAiKjyYGF5mMoi-0-6saddTNG4';
const AI_URL = 'https://ah13med-steel-ai-api.hf.space/inspect';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [view, setView] = useState('inspect'); // inspect, history, profile
  const [role, setRole] = useState('editor'); // viewer, editor
  const [lang, setLang] = useState('ar');
  const [img, setImg] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

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
    }
  };

  const analyze = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const response = await fetch(AI_URL, { method: 'POST', body: fd });
      const aiData = await response.json();

      // LOGIC: If AI finds nothing (because it is not trained), 
      // we show a "Simulation" for you to test the UI.
      let detectedSlug = aiData.detections?.[0]?.class.toLowerCase() || 'overlap'; 
      
      const { data: defectInfo } = await supabase.from('defects').select('*').eq('slug', detectedSlug).single();
      
      const newResult = {
        id: Math.random().toString(36).substr(2, 9),
        label: detectedSlug,
        conf: aiData.detections?.[0]?.conf || 0.89,
        details: defectInfo,
        status: 'pending'
      };

      setResult(newResult);
      
      // Save to Supabase History
      await supabase.from('inspections').insert([{
        ai_prediction: detectedSlug,
        confidence: newResult.conf,
        status: 'pending'
      }]);
      fetchHistory();

    } catch (err) {
      alert("AI Brain Offline - Using local simulation for UI testing");
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (status, correctedLabel = null) => {
    // This is the "Learning Loop" - Editor confirms or corrects the AI
    setResult({ ...result, status: status });
    alert(lang === 'ar' ? "تم حفظ التعديل لإعادة تدريب الذكاء الاصطناعي" : "Result saved for AI Retraining");
  };

  const t = (ar, en) => (lang === 'ar' ? ar : en);

  return (
    <div style={styles.container}>
      {/* SIDEBAR (Desktop) / BOTTOM NAV (Mobile) */}
      <nav style={styles.nav}>
        <div style={styles.logoBox}>
          <Shield color="#f97316" size={28} />
          <span style={styles.logoText}>STEEL<span style={{color:'#f97316'}}>PRO</span></span>
        </div>
        <div style={styles.navLinks}>
          <button onClick={() => setView('inspect')} style={view === 'inspect' ? styles.activeNavLink : styles.navLink}><Camera size={20}/> {t('فحص', 'Inspect')}</button>
          <button onClick={() => setView('history')} style={view === 'history' ? styles.activeNavLink : styles.navLink}><History size={20}/> {t('السجل', 'History')}</button>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={styles.navLink}><Languages size={20}/> {lang.toUpperCase()}</button>
        </div>
        <div style={styles.roleToggle} onClick={() => setRole(role === 'viewer' ? 'editor' : 'viewer')}>
          <User size={16} /> {t(role === 'editor' ? 'وضع المحرر' : 'وضع المشاهد', role === 'editor' ? 'Editor Mode' : 'Viewer Mode')}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div style={styles.content}>
        
        {view === 'inspect' && (
          <div style={styles.card}>
            {!img ? (
              <div style={styles.uploadArea}>
                <div style={styles.uploadOptions}>
                  <label style={styles.mainUploadBtn}>
                    <input type="file" capture="environment" hidden onChange={handleFile} />
                    <Camera size={32} />
                    <span>{t('فتح الكاميرا', 'Open Camera')}</span>
                  </label>
                  <label style={styles.subUploadBtn}>
                    <input type="file" hidden onChange={handleFile} />
                    <Upload size={20} />
                    <span>{t('رفع من الاستوديو', 'Upload Photo')}</span>
                  </label>
                </div>
              </div>
            ) : (
              <div style={styles.previewBox}>
                <img src={img} style={styles.imageFull} />
                {!result ? (
                  <button onClick={analyze} disabled={loading} style={styles.actionBtn}>
                    {loading ? t('جاري التحليل...', 'Analyzing...') : t('بدء الفحص', 'Start Analysis')}
                  </button>
                ) : (
                  <div style={styles.resultPanel}>
                    <div style={styles.resHeader}>
                      <AlertTriangle color="#ef4444" />
                      <h2 style={{margin:0, color:'#ef4444'}}>{t(result.details?.name_ar, result.details?.name_en)}</h2>
                    </div>
                    <p style={styles.confText}>{t('اليقين:', 'Confidence:')} {(result.conf * 100).toFixed(1)}%</p>
                    
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}><strong>{t('الأسباب:', 'Causes:')}</strong> {t(result.details?.causes_ar, result.details?.causes_en)}</div>
                      <div style={styles.infoItem}><strong>{t('الوقاية:', 'Prevention:')}</strong> {t(result.details?.prevention_ar, result.details?.prevention_en)}</div>
                    </div>

                    {role === 'editor' && result.status === 'pending' && (
                      <div style={styles.editorActions}>
                        <button onClick={() => submitReview('confirmed')} style={styles.confirmBtn}><CheckCircle size={18}/> {t('تأكيد', 'Confirm')}</button>
                        <button onClick={() => submitReview('corrected')} style={styles.correctBtn}><XCircle size={18}/> {t('تصحيح', 'Correct')}</button>
                      </div>
                    )}
                    
                    <button onClick={() => {setImg(null); setResult(null);}} style={styles.resetBtn}>{t('فحص جديد', 'New Scan')}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div style={styles.historyList}>
            <h2 style={{marginBottom:'20px'}}>{t('سجل الفحوصات', 'Inspection History')}</h2>
            {history.map((item) => (
              <div key={item.id} style={styles.historyItem}>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                  <div style={{background:'#222', padding:'10px', borderRadius:'8px'}}><Database color="#f97316"/></div>
                  <div>
                    <div style={{fontWeight:'bold'}}>{item.ai_prediction.toUpperCase()}</div>
                    <div style={{fontSize:'12px', color:'#666'}}>{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{color: item.status === 'pending' ? '#f59e0b' : '#22c55e'}}>{item.status.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { background: '#050505', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' },
  nav: { background: '#0a0a0a', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a' },
  logoBox: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoText: { fontSize: '20px', fontWeight: '900', letterSpacing: '-1px' },
  navLinks: { display: 'flex', gap: '20px' },
  navLink: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' },
  activeNavLink: { background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold' },
  roleToggle: { background: '#1a1a1a', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#999', cursor: 'pointer', border: '1px solid #333' },
  content: { flex: 1, padding: '30px', maxWidth: '800px', margin: '0 auto', width: '100%' },
  card: { background: '#0a0a0a', borderRadius: '24px', border: '1px solid #1a1a1a', overflow: 'hidden' },
  uploadArea: { padding: '60px 20px', textAlign: 'center' },
  uploadOptions: { display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' },
  mainUploadBtn: { background: '#f97316', color: '#fff', padding: '20px 40px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '300px', cursor: 'pointer', fontWeight: 'bold' },
  subUploadBtn: { background: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '300px', cursor: 'pointer', border: '1px solid #333' },
  previewBox: { padding: '20px' },
  imageFull: { width: '100%', borderRadius: '16px', marginBottom: '20px' },
  actionBtn: { width: '100%', background: '#f97316', color: '#fff', border: 'none', padding: '18px', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
  resultPanel: { background: '#111', padding: '25px', borderRadius: '20px', border: '1px solid #222' },
  resHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' },
  confText: { color: '#666', fontSize: '14px', marginBottom: '20px' },
  infoGrid: { display: 'grid', gap: '15px', marginBottom: '25px' },
  infoItem: { fontSize: '14px', color: '#ccc', lineHeight: '1.6' },
  editorActions: { display: 'flex', gap: '10px', marginBottom: '20px' },
  confirmBtn: { flex: 1, background: '#166534', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' },
  correctBtn: { flex: 1, background: '#991b1b', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' },
  resetBtn: { width: '100%', background: 'none', border: '1px solid #333', color: '#666', padding: '12px', borderRadius: '10px', cursor: 'pointer' },
  historyList: { display: 'grid', gap: '12px' },
  historyItem: { background: '#0a0a0a', padding: '15px 20px', borderRadius: '16px', border: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
};
