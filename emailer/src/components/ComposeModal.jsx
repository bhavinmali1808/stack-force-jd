import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Paperclip,
  Smile,
  Send,
  Calendar,
  Sparkles,
  ChevronDown,
  Info,
} from 'lucide-react';
import styles from './ComposeModal.module.css';

const ComposeModal = ({
  isOpen,
  onClose,
  selectedContacts = [],
  quota,
  templates = [],
  onSend,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (e) => {
    const tempId = e.target.value;
    setSelectedTemplate(tempId);
    const temp = templates.find((t) => t._id === tempId);
    if (temp) {
      setSubject(temp.subject);
      setBody(temp.bodyHtml.replace(/<p>/g, '').replace(/<\/p>/g, '\n\n'));
    }
  };

  const insertVariable = (variableTag) => {
    setBody((prev) => prev + ` ${variableTag} `);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend({
      recipients: selectedContacts,
      subject,
      bodyHtml: `<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
    });
  };

  return (
    <div className={`${styles.overlay} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.container}>
        {/* Top Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.title}>New email</span>
            {quota && (
              <span className={styles.quotaBadge}>
                {quota.remaining} / {quota.dailyLimit} remaining today
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Minimize' : 'Maximize'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className={styles.iconBtn} onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Compose Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* From row */}
          <div className={styles.row}>
            <label className={styles.label}>From</label>
            <div className={styles.senderPill}>
              <div className={styles.avatar}>DS</div>
              <span className={styles.senderName}>Hiring Team</span>
              <span className={styles.senderEmail}>hr@company.com</span>
            </div>
          </div>

          {/* To row with recipient count pill matching screenshot */}
          <div className={styles.row}>
            <label className={styles.label}>To</label>
            <div className={styles.recipientPillGroup}>
              <div className={styles.avatarStack}>
                {selectedContacts.slice(0, 3).map((c, i) => (
                  <div key={i} className={styles.stackedAvatar}>
                    {c.name ? c.name[0].toUpperCase() : 'C'}
                  </div>
                ))}
              </div>
              <span className={styles.recipientPill}>
                Sending email to {selectedContacts.length} recipient{selectedContacts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Subject row */}
          <div className={styles.row}>
            <input
              type="text"
              placeholder="Type subject here..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={styles.subjectInput}
              required
            />
          </div>

          {/* Variable pills row */}
          <div className={styles.variableBar}>
            <span className={styles.variableHint}>Insert Tag:</span>
            <button
              type="button"
              className={styles.variablePill}
              onClick={() => insertVariable('{{name}}')}
            >
              First name
            </button>
            <button
              type="button"
              className={styles.variablePill}
              onClick={() => insertVariable('{{company}}')}
            >
              Company name
            </button>
          </div>

          {/* Editor Textarea */}
          <div className={styles.editorContainer}>
            <textarea
              className={styles.textarea}
              placeholder="Write your email message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          {/* Bottom Bar matching screenshot */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <select
                className={styles.templateSelect}
                value={selectedTemplate}
                onChange={handleSelectTemplate}
              >
                <option value="">Use template...</option>
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.toolBtn}>
                <Paperclip size={16} />
              </button>
              <button type="button" className={styles.toolBtn}>
                <Smile size={16} />
              </button>
            </div>

            <div className={styles.footerRight}>
              <button type="button" className={styles.deleteBtn} onClick={onClose}>
                Delete
              </button>
              <button type="button" className={styles.sendLaterBtn}>
                <Calendar size={14} /> Send later
              </button>
              <button type="submit" className={styles.sendBtn}>
                Send
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComposeModal;
