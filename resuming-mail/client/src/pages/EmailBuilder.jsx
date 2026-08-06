import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Type, MousePointer, Minus, Code, Layout, Sparkles, Image as ImageIcon, Paperclip, FileText, X } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function EmailBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName]         = useState('Custom Email Design');
  const [category, setCategory] = useState('newsletter');
  const [subject, setSubject]   = useState('');
  const [signature, setSignature] = useState('Best regards,\nThe Resuming.io Team');
  const [attachments, setAttachments] = useState([]);
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
  <p style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 4px;">Best regards,</p>
  <p style="font-size: 14px; color: #6b7280; margin: 0;">The Resuming.io Team</p>
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

  const handleAddImage = () => {
    const url = prompt('Enter Image URL (e.g. https://resuming.io/logo.png):');
    if (url) {
      insertSnippet(`<div style="text-align:center;margin:20px 0;"><img src="${url}" alt="Image" style="max-width:100%;height:auto;border-radius:8px;" /></div>`);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    toast.success(`Attached ${files.length} file(s)`);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 7rem)', gap: '1rem' }}>
      {/* Top Header Bar */}
      <div style={{
        background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <button onClick={() => navigate('/templates')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <input
            className="input"
            style={{ fontWeight: 600, width: '220px', background: '#fff', color: '#111827' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Template Name..."
          />
          <input
            className="input"
            style={{ width: '280px', background: '#fff', color: '#111827' }}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Default Subject Line..."
          />
          <select className="select" style={{ background: '#fff', color: '#111827' }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="newsletter">Newsletter</option>
            <option value="onboarding">Onboarding</option>
            <option value="promotional">Promotional</option>
            <option value="transactional">Transactional</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: '#f3f4f6', padding: '3px', borderRadius: '8px', display: 'flex', gap: '2px' }}>
            <button
              onClick={() => setTab('editor')}
              style={{
                border: 'none', background: tab === 'editor' ? '#fff' : 'transparent',
                color: tab === 'editor' ? 'var(--purple)' : 'var(--text-3)',
                padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                boxShadow: tab === 'editor' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Code size={13} /> HTML Editor
            </button>
            <button
              onClick={() => setTab('preview')}
              style={{
                border: 'none', background: tab === 'preview' ? '#fff' : 'transparent',
                color: tab === 'preview' ? 'var(--purple)' : 'var(--text-3)',
                padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                boxShadow: tab === 'preview' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Eye size={13} /> Live Preview
            </button>
          </div>
          <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ background: 'var(--purple)' }}>
            <Save size={14} /> {loading ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* Left Control Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', background: '#fff' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sparkles size={12} /> Rich Elements
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button onClick={() => insertSnippet('<h2 style="color:#111827;font-size:20px;margin-bottom:12px;">Headline Title</h2>')} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <Type size={15} /> Title
              </button>
              <button onClick={() => insertSnippet('<p style="font-size:14px;color:#4b5563;line-height:1.6;">Body text content goes here...</p>')} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <Layout size={15} /> Paragraph
              </button>
              <button onClick={() => insertSnippet('<a href="https://resuming.io" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">Call To Action</a>')} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <MousePointer size={15} /> Button
              </button>
              <button onClick={handleAddImage} className="btn-ghost" style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '0.75rem', gap: '0.25rem', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <ImageIcon size={15} /> Image
              </button>
            </div>
          </div>

          {/* Signature Block */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
              Email Signature
            </div>
            <button
              onClick={() => insertSnippet(`<div style="margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb;"><p style="font-weight:bold;color:#111827;margin:0 0 4px 0;">Best regards,</p><p style="color:#4b5563;margin:0;">The Resuming.io Team</p></div>`)}
              className="btn-secondary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
            >
              <FileText size={13} /> Insert Preset Signature
            </button>
          </div>

          {/* PDF & Media Attachments */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
              Attachments (PDF / Docs)
            </div>
            <label className="btn-secondary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.75rem' }}>
              <Paperclip size={13} /> Attach PDF or File
              <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            {attachments.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {attachments.map((att, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f3f4f6', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', color: 'var(--text-1)' }}>📎 {att.name}</span>
                    <button onClick={() => removeAttachment(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Merge Tags */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
              Merge Variables
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {['first_name', 'last_name', 'email', 'plan', 'resume_title', 'verification_link', 'otp'].map(v => (
                <button
                  key={v}
                  onClick={() => insertSnippet(`{{${v}}}`)}
                  style={{
                    fontSize: '0.6875rem', fontFamily: 'monospace', background: '#f3f4f6', border: '1px solid #e5e7eb',
                    borderRadius: '4px', padding: '0.25rem 0.45rem', cursor: 'pointer', color: 'var(--purple)', fontWeight: 600
                  }}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workspace Canvas */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid var(--border)' }}>
          {tab === 'editor' ? (
            <textarea
              style={{
                width: '100%', height: '100%', padding: '1.25rem', background: '#ffffff',
                border: 'none', fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.875rem',
                outline: 'none', resize: 'none', color: '#111827', lineHeight: 1.55,
              }}
              value={html}
              onChange={e => setHtml(e.target.value)}
              placeholder="Type HTML email body..."
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#f8fafc', padding: '2rem', overflowY: 'auto' }}>
              <div
                style={{
                  maxWidth: '620px', margin: '0 auto', background: '#ffffff',
                  borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0', color: '#1e293b'
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

