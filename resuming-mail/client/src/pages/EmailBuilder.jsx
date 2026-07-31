import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Type, Image as ImageIcon, MousePointer, Minus, Columns, Code, Layout } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function EmailBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('Custom Template');
  const [category, setCategory] = useState('custom');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<h1>Welcome!</h1>\n<p>Write your email content here or use variables like {{first_name}}.</p>');
  const [tab, setTab] = useState('editor'); // editor | preview
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/templates/${id}`).then(res => {
        if (res.data.success) {
          setName(res.data.template.name);
          setCategory(res.data.template.category || 'custom');
          setSubject(res.data.template.subject || '');
          setHtml(res.data.template.html || '');
        }
      });
    }
  }, [id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (id && id !== 'new' && !id.startsWith('sys-')) {
        await api.put(`/templates/${id}`, { name, category, subject, html });
        toast.success('Template saved');
      } else {
        await api.post('/templates', { name, category, subject, html });
        toast.success('Template created');
      }
      navigate('/templates');
    } catch (err) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const insertSnippet = (snippet) => {
    setHtml(prev => prev + '\n' + snippet);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/templates')} className="btn-ghost py-1 px-3">
            <ArrowLeft size={16} /> Exit
          </button>
          <input className="input w-64" value={name} onChange={e => setName(e.target.value)} placeholder="Template Name" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setTab('editor')} className={`btn-ghost ${tab === 'editor' ? 'bg-indigo-600/30 text-indigo-400' : ''}`}>
            <Code size={16} /> Editor
          </button>
          <button onClick={() => setTab('preview')} className={`btn-ghost ${tab === 'preview' ? 'bg-indigo-600/30 text-indigo-400' : ''}`}>
            <Eye size={16} /> Live Preview
          </button>
          <button onClick={handleSave} disabled={loading} className="btn-primary">
            <Save size={16} /> Save Template
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">
        {/* Left Palette */}
        <div className="card space-y-4 overflow-y-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Insert Blocks</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => insertSnippet('<h2>Heading</h2>')} className="p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs flex flex-col items-center gap-2 text-slate-300">
              <Type size={16} /> Heading
            </button>
            <button onClick={() => insertSnippet('<p>Paragraph text goes here...</p>')} className="p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs flex flex-col items-center gap-2 text-slate-300">
              <Layout size={16} /> Paragraph
            </button>
            <button onClick={() => insertSnippet('<a href="https://resuming.io" class="btn">Click Here</a>')} className="p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs flex flex-col items-center gap-2 text-slate-300">
              <MousePointer size={16} /> Button
            </button>
            <button onClick={() => insertSnippet('<hr style="border:0;border-top:1px solid #334155;margin:20px 0;"/>')} className="p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs flex flex-col items-center gap-2 text-slate-300">
              <Minus size={16} /> Divider
            </button>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-4 border-t border-slate-800">Dynamic Variables</h3>
          <div className="flex flex-wrap gap-1">
            {['first_name', 'last_name', 'email', 'plan', 'resume_score', 'resume_title', 'verification_link', 'otp'].map(v => (
              <button key={v} onClick={() => insertSnippet(`{{${v}}}`)} className="text-xs bg-indigo-950 text-indigo-300 hover:bg-indigo-900 px-2 py-1 rounded">
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Center Workbench */}
        <div className="md:col-span-3 card p-0 flex flex-col overflow-hidden">
          {tab === 'editor' ? (
            <textarea
              className="w-full h-full p-4 bg-white border-2 border-black text-black font-mono text-sm outline-none resize-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              value={html}
              onChange={e => setHtml(e.target.value)}
              placeholder="Write raw HTML or use block snippets..."
            />
          ) : (
            <div className="w-full h-full bg-slate-950 p-6 overflow-y-auto">
              <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 text-slate-100 shadow-2xl" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
