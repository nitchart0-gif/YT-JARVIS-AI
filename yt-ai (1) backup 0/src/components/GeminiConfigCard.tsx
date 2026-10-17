import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Play,
  RotateCw,
  AlertTriangle,
  Loader2,
  Lock,
  Cpu,
} from 'lucide-react';
import { api, type GeminiKeyStatusResponse } from '../services/api.ts';

interface GeminiConfigCardProps {
  userId: string;
}

export const GeminiConfigCard: React.FC<GeminiConfigCardProps> = ({ userId }) => {
  const [keyStatus, setKeyStatus] = useState<GeminiKeyStatusResponse | null>(null);
  const [inputKey, setInputKey] = useState<string>('');
  const [showInputKey, setShowInputKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [probeLoading, setProbeLoading] = useState<boolean>(false);
  const [isReplacing, setIsReplacing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Load existing status for user
  const fetchStatus = async () => {
    try {
      const res = await api.getKeyStatus(userId);
      setKeyStatus(res);
      if (res.configured) {
        setIsReplacing(false);
      }
    } catch {
      // Silently ignore initial fetch error
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStatus();
    }
  }, [userId]);

  // Validation only
  const handleValidateOnly = async () => {
    if (!inputKey.trim()) {
      setFeedback({ type: 'error', message: 'Please enter an API key to validate.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.validateKey(inputKey.trim());
      if (res.valid) {
        setFeedback({
          type: 'success',
          message: `Verification Successful! Model ${res.model} responded in ${res.latencyMs}ms.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Verification failed.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'API key validation failed. Please verify in Google AI Studio.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save & Validate
  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid Gemini API key.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.saveKey(userId, inputKey.trim());
      setFeedback({
        type: 'success',
        message: res.message || 'API Key successfully verified and encrypted with AES-256-GCM.',
      });
      setInputKey('');
      setShowInputKey(false);
      setIsReplacing(false);
      await fetchStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save and validate API key.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Run Test Probe on server-saved encrypted key
  const handleTestProbe = async () => {
    setProbeLoading(true);
    setFeedback(null);
    try {
      const res = await api.testKeyProbe(userId);
      if (res.valid) {
        setFeedback({
          type: 'success',
          message: `Stored Key Verified! Server decrypted and queried ${res.model} in ${res.latencyMs}ms without client exposure.`,
        });
        await fetchStatus();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Probe test failed.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Test probe failed.',
      });
    } finally {
      setProbeLoading(false);
    }
  };

  // Delete saved key
  const handleDeleteKey = async () => {
    if (!window.confirm('Are you sure you want to delete the saved Gemini API key? It will be permanently removed from server storage.')) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await api.deleteKey(userId);
      setFeedback({
        type: 'info',
        message: 'Saved Gemini API key was securely removed.',
      });
      setInputKey('');
      setIsReplacing(false);
      await fetchStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete key.',
      });
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = keyStatus?.configured === true;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          <div className={`p-3 rounded-xl border ${isConfigured ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-800/60 border-slate-700/60 text-slate-400'}`}>
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-semibold text-white">Gemini API Configuration</h3>
              {isConfigured ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Configured & Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-400">
                  <XCircle className="w-3 h-3" />
                  <span>Not Configured</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
              <span>Required Model:</span>
              <span className="font-mono text-indigo-300 font-semibold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                gemini-3.8-flash
              </span>
              <span className="text-[10px] text-slate-400">(Model locked)</span>
            </p>
          </div>
        </div>

        {/* Official Direct Links */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <span>Google AI Studio Keys</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <span>Cloud Console Credentials</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mt-4 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : feedback.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : feedback.type === 'error' ? (
            <XCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1 leading-relaxed">{feedback.message}</span>
        </div>
      )}

      {/* Main Configuration State */}
      <div className="mt-6">
        {isConfigured && !isReplacing ? (
          /* State 1: Key is currently configured */
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-medium">Currently Stored API Key:</div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm tracking-wider font-semibold text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    {keyStatus.maskedKey}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>AES-256-GCM Encrypted</span>
                  </span>
                </div>
                {keyStatus.lastValidatedAt && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    Last Verified: {new Date(keyStatus.lastValidatedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stored Key Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestProbe}
                  disabled={probeLoading || loading}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 text-indigo-400 ${probeLoading ? 'animate-spin' : ''}`} />
                  <span>{probeLoading ? 'Probing...' : 'Run Test Probe'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReplacing(true)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Replace API Key</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteKey}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Saved Key</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: Key entry form (Initial setup or Replace) */
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="gemini-key-input" className="text-xs font-semibold text-slate-300">
                  Enter Gemini API Key
                </label>
                {isReplacing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacing(false);
                      setInputKey('');
                      setFeedback(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-300 underline cursor-pointer"
                  >
                    Cancel Replace
                  </button>
                )}
              </div>

              {/* Password Input with Show/Hide toggle */}
              <div className="relative">
                <input
                  id="gemini-key-input"
                  type={showInputKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  spellCheck="false"
                  disabled={loading}
                  className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowInputKey(!showInputKey)}
                  aria-label={showInputKey ? 'Hide key' : 'Show key'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                >
                  {showInputKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                The key will be verified immediately via a harmless probe to <code className="text-indigo-300 font-mono">gemini-3.8-flash</code> and stored with server-side AES-256-GCM encryption. It will never be returned in plaintext.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !inputKey.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>{loading ? 'Validating & Saving...' : 'Save & Encrypt Key'}</span>
              </button>

              <button
                type="button"
                onClick={handleValidateOnly}
                disabled={loading || !inputKey.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>Validate Key Only</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Security & Billing Advisory */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Client Leakage Architecture</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Keys are never embedded into frontend HTML, JavaScript bundles, URLs, or browser cookies/storage. All queries and probes are proxied exclusively by the backend using strict ownership checks.
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Billing & Quota Responsibilities</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            API keys may incur usage charges according to your Google Cloud or Google AI Studio billing plan. Ensure your Google Cloud project is secured and quota alerts are set.
          </p>
        </div>
      </div>
    </div>
  );
};
