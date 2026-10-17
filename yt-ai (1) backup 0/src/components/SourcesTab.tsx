import React, { useState, useEffect } from 'react';
import {
  FileText,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  PlusCircle,
  Eraser,
  Database,
  Calendar,
  Edit3,
  ExternalLink,
  Eye,
  X,
  Clapperboard,
  Save,
} from 'lucide-react';

import {
  subscribeUserSources,
  saveUserSource,
  deleteUserSource,
  type SourceItem as FirestoreSourceItem,
} from '../services/firestoreService.ts';

export interface SourceItem {
  id: string;
  title: string;
  text: string;
  createdAt: number | string;
  updatedAt?: number | string;
  userId?: string;
}

interface SourcesTabProps {
  userId: string;
  onSelectForScript?: (sourceId: string) => void;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({ userId, onSelectForScript }) => {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [inputTitle, setInputTitle] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states for View and Edit
  const [viewingSource, setViewingSource] = useState<SourceItem | null>(null);
  const [editingSource, setEditingSource] = useState<SourceItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editText, setEditText] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const storageKey = `ytai_sources_${userId}`;
  const legacyKey = `workspace_portal_sources_${userId}`;

  // Load saved sources from storage and subscribe to real-time Firestore if authenticated
  useEffect(() => {
    // 1. Initial read from local cache (checking new key and legacy key)
    try {
      const stored = localStorage.getItem(storageKey) || localStorage.getItem(legacyKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated: SourceItem[] = parsed.map((item: any, idx: number) => {
            if (!item.title) {
              const firstLine = (item.text || '').trim().split('\n')[0].slice(0, 40);
              return {
                ...item,
                title: firstLine || `Source Article #${parsed.length - idx}`,
              };
            }
            return item;
          });
          setSources(migrated);
        }
      }
    } catch {
      console.warn('Could not read saved sources from storage.');
    }

    // 2. If authenticated with a real Firebase UID, subscribe to Firestore
    if (userId && userId !== 'local_creator') {
      const unsubscribe = subscribeUserSources(
        userId,
        (firestoreItems) => {
          if (firestoreItems && firestoreItems.length > 0) {
            setSources(firestoreItems);
            localStorage.setItem(storageKey, JSON.stringify(firestoreItems));
          }
        },
        (err) => {
          console.warn('Firestore subscription fallback to local cache:', err.message);
        },
      );
      return () => unsubscribe();
    }
  }, [userId, storageKey, legacyKey]);

  // Persist sources helper
  const persistSources = (updated: SourceItem[]) => {
    setSources(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      console.warn('Could not save sources to local storage.');
    }
  };

  // Handle Save Source
  const handleSaveSource = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      setErrorMessage('Source text cannot be empty or whitespace only.');
      return;
    }

    setErrorMessage(null);
    let finalTitle = inputTitle.trim();
    if (!finalTitle) {
      // Auto-derive clean title from the first sentence or heading if user leaves blank
      const firstLine = trimmedText.split('\n')[0].replace(/[#*`_]/g, '').trim();
      finalTitle = firstLine.slice(0, 50) || `Source Article #${sources.length + 1}`;
    }

    const newSource: SourceItem = {
      id: `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: finalTitle,
      text: inputText, // Preserves original formatting and line breaks
      createdAt: new Date().toISOString(),
      userId,
    };

    // Prepend new source locally
    const updated = [newSource, ...sources];
    persistSources(updated);
    setInputTitle('');
    setInputText('');
    setSuccessMessage(`Source "${finalTitle}" saved!`);
    setTimeout(() => setSuccessMessage(null), 3000);

    if (userId && userId !== 'local_creator') {
      saveUserSource(userId, newSource).catch((err) => {
        console.warn('Firestore source save notice:', err.message);
      });
    }
  };

  // Handle Clear Input
  const handleClear = () => {
    setInputTitle('');
    setInputText('');
    setErrorMessage(null);
  };

  // Open Edit Modal
  const handleStartEdit = (item: SourceItem) => {
    setEditingSource(item);
    setEditTitle(item.title || '');
    setEditText(item.text || '');
    setEditError(null);
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;
    const trimmedText = editText.trim();
    if (!trimmedText) {
      setEditError('Source text cannot be empty or whitespace only.');
      return;
    }

    let finalTitle = editTitle.trim();
    if (!finalTitle) {
      finalTitle = trimmedText.split('\n')[0].slice(0, 50) || editingSource.title;
    }

    const updatedSource: SourceItem = {
      ...editingSource,
      title: finalTitle,
      text: editText,
      updatedAt: new Date().toISOString(),
      userId,
    };

    const updated = sources.map((s) => (s.id === editingSource.id ? updatedSource : s));

    persistSources(updated);
    setEditingSource(null);
    setSuccessMessage(`Source "${finalTitle}" updated!`);
    setTimeout(() => setSuccessMessage(null), 3000);

    if (userId && userId !== 'local_creator') {
      saveUserSource(userId, updatedSource).catch((err) => {
        console.warn('Firestore source update notice:', err.message);
      });
    }
  };

  // Handle Copy Text to Clipboard
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    }
  };

  // Handle Delete Source with confirmation
  const handleDelete = (id: string, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`);
    if (!confirmed) return;

    const filtered = sources.filter((item) => item.id !== id);
    persistSources(filtered);
    if (viewingSource?.id === id) setViewingSource(null);
    if (editingSource?.id === id) setEditingSource(null);

    if (userId && userId !== 'local_creator') {
      deleteUserSource(userId, id).catch((err) => {
        console.warn('Firestore source delete notice:', err.message);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center space-x-3.5">
          <div
            className="p-3 rounded-xl text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Sources & Research Hub
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              The central place to store and manage articles and reference texts for AI script generation.
            </p>
          </div>
        </div>
        <div
          className="text-xs font-mono px-3.5 py-1.5 rounded-xl border self-start sm:self-auto"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent-text)',
          }}
        >
          {sources.length} {sources.length === 1 ? 'Source' : 'Sources'} Saved
        </div>
      </div>

      {/* Storage Architecture Notice */}
      <div
        className="p-4 rounded-xl border text-xs flex items-start space-x-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <Database className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
        <div className="leading-relaxed">
          <strong style={{ color: 'var(--text-primary)' }}>Storage Architecture:</strong> Saved sources are persisted locally in your browser storage and will survive page refreshes. When signed in with Google, your research library automatically synchronizes in real-time with Google Cloud Firestore.
        </div>
      </div>

      {/* Input Area Card */}
      <div
        className="rounded-2xl p-6 border shadow-xl backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <PlusCircle className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          <span>Add New Source</span>
        </h3>

        <form onSubmit={handleSaveSource} className="space-y-4">
          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Source Title <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>(Optional descriptive title)</span>
            </label>
            <input
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              placeholder="e.g. Breaking AI Summit Highlights, Tech Policy Memo, Q3 Earnings..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Multiline Textarea */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Source Article / Text <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Paste your article or source text here..."
              rows={8}
              className="w-full p-4 rounded-xl text-sm font-sans border transition-all resize-y leading-relaxed focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-base)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex items-center justify-between text-[11px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
              <span>Preserves original line breaks and indentation</span>
              <span>{inputText.length.toLocaleString()} characters • {inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean).length : 0} words</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-white"
              style={{
                backgroundColor: 'var(--accent-primary)',
                boxShadow: '0 4px 12px var(--accent-glow)',
              }}
            >
              <FileText className="w-4 h-4" />
              <span>Save Source</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={!inputText && !inputTitle}
              className="px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <Eraser className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span>Clear</span>
            </button>
          </div>
        </form>
      </div>

      {/* Saved Sources List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center space-x-2" style={{ color: 'var(--text-secondary)' }}>
            <FileText className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span>Saved Sources ({sources.length})</span>
          </h3>
        </div>

        {sources.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center shadow-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="inline-flex p-3 rounded-2xl border mb-3"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              No sources saved yet
            </h4>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Paste an article, notes, or research text in the area above and click <strong>Save Source</strong> to store it here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((item, index) => {
              const isCopied = copiedId === item.id;
              const formattedDate = new Date(item.createdAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-5 shadow-xl transition-all border relative group"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  {/* Item Header */}
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b text-xs"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <span
                        className="font-semibold px-2 py-0.5 rounded text-[11px] font-mono"
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        #{sources.length - index}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formattedDate}</span>
                          </span>
                          <span>•</span>
                          <span>{item.text.length.toLocaleString()} chars</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Select for Generator, View, Edit, Copy & Delete */}
                    <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                      {onSelectForScript && (
                        <button
                          type="button"
                          onClick={() => onSelectForScript(item.id)}
                          title="Generate script from this source"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-all text-white cursor-pointer"
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                          }}
                        >
                          <Clapperboard className="w-3.5 h-3.5" />
                          <span>Generate Script</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingSource(item)}
                        title="View full text"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1 transition-colors cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        title="Edit title and content"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1 transition-colors cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Edit3 className="w-3.5 h-3.5" style={{ color: 'var(--accent-text)' }} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.text)}
                        title="Copy text to clipboard"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1 transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isCopied ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-elevated)',
                          borderColor: isCopied ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
                          color: isCopied ? '#34d399' : 'var(--text-secondary)',
                        }}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        title="Delete this source"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Item Content Preview with formatting preserved */}
                  <div
                    className="rounded-xl p-4 overflow-x-auto max-h-48 overflow-y-auto border"
                    style={{
                      backgroundColor: 'var(--bg-base)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <pre
                      className="text-xs font-sans whitespace-pre-wrap break-words leading-relaxed"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.text}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW SOURCE MODAL */}
      {viewingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Modal Header */}
            <div
              className="p-5 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {viewingSource.title}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Created on {new Date(viewingSource.createdAt).toLocaleString()} • {viewingSource.text.length.toLocaleString()} characters
                </p>
              </div>
              <button
                onClick={() => setViewingSource(null)}
                className="p-1.5 rounded-lg border text-xs cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <pre
                className="text-xs font-sans whitespace-pre-wrap break-words leading-relaxed p-4 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {viewingSource.text}
              </pre>
            </div>

            {/* Modal Footer */}
            <div
              className="p-4 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
            >
              <button
                onClick={() => handleCopy(viewingSource.id, viewingSource.text)}
                className="px-4 py-2 rounded-xl text-xs font-medium border flex items-center space-x-1.5 cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Full Text</span>
              </button>

              <div className="flex items-center space-x-2">
                {onSelectForScript && (
                  <button
                    onClick={() => {
                      onSelectForScript(viewingSource.id);
                      setViewingSource(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    Use in Script Generator
                  </button>
                )}
                <button
                  onClick={() => setViewingSource(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SOURCE MODAL */}
      {editingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveEdit}
            className="rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="p-5 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Edit Source
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Update the title or content of this saved source article.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSource(null)}
                className="p-1.5 rounded-lg border text-xs cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Source Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Source Content
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  rows={10}
                  className="w-full p-4 rounded-xl text-sm font-sans border focus:outline-none focus:ring-2 resize-y"
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{editError}</span>
                </div>
              )}
            </div>

            <div
              className="p-4 border-t flex items-center justify-end space-x-3"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
            >
              <button
                type="button"
                onClick={() => setEditingSource(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white flex items-center space-x-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
