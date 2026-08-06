import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Type, MousePointer, Minus, Code, Layout, Sparkles } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function EmailBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName]         = useState('Custom Email Design');
  const [category, setCategory] = useState('newsletter');
  const [subject, setSubject]   = useState('');
  const [html, setHtml]         = useState(
`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333;">
  <h1 style="color: #4f46e5; font-size: 24px; margin-bottom: 16px;">Hello {{first_name|there}}!</h1>
  <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
    Welcome to our latest update. We are excited to share new career opportunities and features tailored for you.
  </p>
  <div style="margin: 30px 0; text-align: center;">
    <a href="https://resuming.io" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Explore Now</a>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
    © Resuming.io · You received this because you are subscribed to our platform.
  </p>
</div>`
  );
  const [tab, setTab]         = useState('editor'); // editor | preview
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/templates/${id}`).then(res => {
        if (res.data.success) {
          setName(res.data.template.name);
          setCategory(res.data.template.category || 'newsletter');
          setSubject(res.data.template.subject || '');
          setHtml(res.data.template.html || '');
        }
      });
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Template name required');
    setLoading(true);
    try {
      if (id && id !== 'new' && !id.startsWith('sys-')) {
        await api.put(`/templates/${id}`, { name, category, subject, html });
        toast.success('Template updated!');
      } else {
        await api.post('/templates', { name, category, subject, html });
        toast.success('Template created!');
      }
      navigate('/templates');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const insertSnippet = (snippet) => {
    setHtml(prev => prev + '\n' + snippet);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 7rem)', gap: '1rem' }}>
      {/* Header Bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <button onClick={() => navigate('/templates')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <input
            className="input"
            style={{ fontWeight: 600, width: '260px' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Template Name..."
          />
          <input
            className="input"
            style={{ width: '320px' }}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Default Email Subject Line..."
          />
          <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="newsletter">Newsletter</option>
            <option value="onboarding">Onboarding</option>
            <option value="promotional">Promotional</option>
            <option value="transactional">Transactional</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => setTab('editor')} className={tab === 'editor' ? 'btn-primary' : 'btn-ghost'}>
            <Code size={14} /> Editor
          </button>
          <button onClick={() => setTab('preview')} className={tab === 'preview' ? 'btn-primary' : 'btn-ghost'}>
            <Eye size={14} /> Live Preview
          </button>
          <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ background: 'var(--green)' }}>
            <Save size={14} /> {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* Left Palette */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sparkles size={12} /> Insert Elements
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button onClick={() => insertSnippet('<h2 style="color:#111827;font-size:20px;">Headline Title</h2>')} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                <Type size={16} /> Title
              </button>
              <button onClick={() => insertSnippet('<p style="font-size:14px;color:#4b5563;line-height:1.6;">Body text content goes here...</p>')} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                <Layout size={16} /> Paragraph
              </button>
              <button onClick={() => insertSnippet('<a href="https://resuming.io" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">Call To Action</a>')} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                <MousePointer size={16} /> Button
              </button>
              <button onClick={() => insertSnippet('<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>')} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                <Minus size={16} /> Divider
              </button>
            </div>
          </div>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
              Dynamic Variables
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {['first_name', 'last_name', 'email', 'plan', 'resume_title', 'verification_link', 'otp'].map(v => (
                <button
                  key={v}
                  onClick={() => insertSnippet(`{{${v}}}`)}
                  style={{
                    fontSize: '0.6875rem', fontFamily: 'monospace', background: '#f3f4f6', border: '1px solid #e5e7eb',
                    borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', color: 'var(--purple)', fontWeight: 600
                  }}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Workbench */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {tab === 'editor' ? (
            <textarea
              style={{
                width: '100%', height: '100%', padding: '1.25rem', background: '#ffffff',
                border: 'none', fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.8125rem',
                outline: 'none', resize: 'none', color: '#111827', lineHeight: 1.5,
              }}
              value={html}
              onChange={e => setHtml(e.target.value)}
              placeholder="Write raw HTML or use block snippets..."
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#f3f4f6', padding: '2rem', overflowY: 'auto' }}>
              <div
                style={{
                  maxWidth: '640px', margin: '0 auto', background: '#ffffff',
                  borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: '1px solid #e5e7eb',
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
