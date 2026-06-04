import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- UPDATE THESE WITH YOUR ACTUAL DATA ---
const SUPABASE_URL = 'https://wbqnuxsdshvfxdznysyx.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicW51eHNkc2h2Znhkem55c3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTA4NDksImV4cCI6MjA5NjA2Njg0OX0.gZvdaAnzCN4i1zOS7LAiKjyYGF5mMoi-0-6saddTNG4';
const AI_URL = 'https://ah13med-steel-ai-api.hf.space';
// ------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [img, setImg] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [lang, setLang] = useState('ar');

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setImg(URL.createObjectURL(f));
      setRes(null);
    }
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const response = await fetch(AI_URL, { method: 'POST', body: fd });
      const aiData = await response.json();

      if (aiData.detections && aiData.detections.length > 0) {
        const slug = aiData.detections[0].class.toLowerCase();
        const { data } = await supabase.from('defects').select('*').eq('slug', slug).single();
        setRes({ ...aiData.detections[0], details: data });
      } else {
        alert(lang === 'ar' ? "لم يتم اكتشاف عيوب" : "No defects detected");
      }
    } catch (err) {
      alert("Error: AI Brain is Offline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#f97316' }}>STEEL AI PRO</h2>
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ padding: '8px 15px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '5px' }}>
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      {!img ? (
        <label style={{ border: '2px dashed #333', borderRadius: '15px', padding: '60px 20px', display: 'block', marginTop: '40px', cursor: 'pointer' }}>
          <input type="file" capture="environment" hidden onChange={handleFile} />
          <span style={{ fontSize: '40px' }}>📷</span>
          <p>{lang === 'ar' ? 'إضغط لتصوير المنتج' : 'Tap to scan product'}</p>
        </label>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <img src={img} style={{ width: '100%', borderRadius: '10px' }} alt="preview" />
          {!res && (
            <button onClick={analyze} disabled={loading} style={{ width: '100%', padding: '15px', background: '#f97316', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '10px', marginTop: '10px' }}>
              {loading ? '...' : (lang === 'ar' ? 'بدء التحليل' : 'Start Analysis')}
            </button>
          )}
          {res && (
            <div style={{ background: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #f97316', marginTop: '20px', textAlign: lang === 'ar' ? 'right' : 'left' }}>
              <h2 style={{ color: '#ef4444', textAlign: 'center' }}>{lang === 'ar' ? res.details?.name_ar : res.details?.name_en}</h2>
              <p><b>{lang === 'ar' ? 'الأسباب:' : 'Causes:'}</b> {lang === 'ar' ? res.details?.causes_ar : res.details?.causes_en}</p>
              <p><b>{lang === 'ar' ? 'الوقاية:' : 'Prevention:'}</b> {lang === 'ar' ? res.details?.prevention_ar : res.details?.prevention_en}</p>
              <button onClick={() => setImg(null)} style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', marginTop: '15px' }}>
                {lang === 'ar' ? 'فحص جديد' : 'New Scan'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
