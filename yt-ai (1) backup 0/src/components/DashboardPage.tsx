import React, { useState } from 'react';
import { type User } from 'firebase/auth';
import {
  Clapperboard,
  Film,
  Search,
  Image as ImageIcon,
  Scissors,
  FileText,
  KeyRound,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
  HardDrive,
  LogIn,
  Settings,
} from 'lucide-react';
import { logOut } from '../services/firebase.ts';
import { DriveStatusCard } from './DriveStatusCard.tsx';
import { GeminiConfigCard } from './GeminiConfigCard.tsx';
import { SourcesTab } from './SourcesTab.tsx';
import { ScriptGeneratorTab } from './ScriptGeneratorTab.tsx';
import { VideoPromptBuilderTab } from './VideoPromptBuilderTab.tsx';
import { SEOStudioTab } from './SEOStudioTab.tsx';
import { ThumbnailStudioTab } from './ThumbnailStudioTab.tsx';
import { YTEditorTab } from './YTEditorTab.tsx';
import { SettingsPage } from './SettingsPage.tsx';
import { AppLayout } from './layout/AppLayout.tsx';
import { type NavigationPageId } from '../navigation.ts';
import { type ScriptGenerationResponse } from '../services/api.ts';

interface DashboardPageProps {
  user: User | null;
  onSignOut: () => void;
  onSignIn?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onSignOut, onSignIn }) => {
  const [activePage, setActivePage] = useState<NavigationPageId>('overview');
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [signingOut, setSigningOut] = useState<boolean>(false);

  const effectiveUserId = user ? user.uid : 'local_creator';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logOut();
      onSignOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setSigningOut(false);
    }
  };

  const [selectedScriptSourceId, setSelectedScriptSourceId] = useState<string | null>(null);

  const handleSelectSourceForScript = (sourceId: string) => {
    setSelectedScriptSourceId(sourceId);
    setActivePage('scripts');
  };

  const [transferredScript, setTransferredScript] = useState<ScriptGenerationResponse | null>(null);
  const [transferredSourceTitle, setTransferredSourceTitle] = useState<string>('');

  const handleTransferToVideoPrompts = (scriptData: ScriptGenerationResponse, sourceTitle?: string) => {
    setTransferredScript(scriptData);
    setTransferredSourceTitle(sourceTitle || `${scriptData.contentMode} Video Script`);
    setActivePage('video-prompts');
  };

  const [transferredSEOScript, setTransferredSEOScript] = useState<ScriptGenerationResponse | null>(null);
  const [transferredSEOSourceTitle, setTransferredSEOSourceTitle] = useState<string>('');
  const [transferredSEOSourceArticle, setTransferredSEOSourceArticle] = useState<string>('');

  const handleTransferToSEOStudio = (
    scriptData: ScriptGenerationResponse,
    sourceTitle?: string,
    sourceArticle?: string,
  ) => {
    setTransferredSEOScript(scriptData);
    setTransferredSEOSourceTitle(sourceTitle || `${scriptData.contentMode} Video Script`);
    setTransferredSEOSourceArticle(sourceArticle || '');
    setActivePage('seo-studio');
  };

  const [transferredThumbScript, setTransferredThumbScript] = useState<ScriptGenerationResponse | null>(null);
  const [transferredThumbSourceTitle, setTransferredThumbSourceTitle] = useState<string>('');
  const [transferredThumbSourceArticle, setTransferredThumbSourceArticle] = useState<string>('');
  const [transferredThumbConcept, setTransferredThumbConcept] = useState<any>(null);

  const [transferredEditorScript, setTransferredEditorScript] = useState<ScriptGenerationResponse | null>(null);
  const [transferredEditorSourceTitle, setTransferredEditorSourceTitle] = useState<string>('');

  const handleTransferToYTEditor = (script?: ScriptGenerationResponse | null, sourceTitle?: string) => {
    if (script) setTransferredEditorScript(script);
    if (sourceTitle) setTransferredEditorSourceTitle(sourceTitle);
    setActivePage('yt-editor');
  };

  const handleTransferToThumbnailStudio = (params: {
    script?: ScriptGenerationResponse | null;
    sourceTitle?: string;
    sourceArticle?: string;
    concept?: any;
  }) => {
    if (params.script) setTransferredThumbScript(params.script);
    if (params.sourceTitle) setTransferredThumbSourceTitle(params.sourceTitle);
    if (params.sourceArticle) setTransferredThumbSourceArticle(params.sourceArticle);
    if (params.concept) setTransferredThumbConcept(params.concept);
    setActivePage('thumbnail-studio');
  };

  return (
    <AppLayout
      user={user}
      activePage={activePage}
      onSelectPage={setActivePage}
      onSignOut={handleSignOut}
      onSignIn={onSignIn}
      signingOut={signingOut}
    >
      {/* 1. OVERVIEW PAGE — Authentic YT-AI Studio Dashboard */}
      {activePage === 'overview' && (
        <div className="space-y-8">
          {/* Hero Banner */}
          <section
            className="rounded-3xl p-6 sm:p-8 border shadow-xl backdrop-blur-xl relative overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Background gradient decorative glow */}
            <div
              className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>YT-AI Video Production Suite</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Welcome to YT-AI Studio
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  A unified AI creator studio for YouTube. Transform articles into viral scripts, generate cinematographic Google Flow video prompts, optimize metadata with SEO Studio, craft high-CTR thumbnails, and edit in the multi-track video timeline.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setActivePage('scripts')}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <Clapperboard className="w-4 h-4" />
                    <span>Create New Script</span>
                  </button>
                  <button
                    onClick={() => setActivePage('yt-editor')}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-800/20 transition-all cursor-pointer"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Scissors className="w-4 h-4 text-red-400" />
                    <span>Open YT Editor</span>
                  </button>
                </div>
              </div>

              {/* Status & Sync Card */}
              <div
                className="p-5 rounded-2xl border space-y-3 min-w-[280px]"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="text-xs font-semibold flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Workspace Status</span>
                  <span className="flex items-center space-x-1.5 text-emerald-400 text-[11px] font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Account:</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {user ? user.displayName || user.email : 'Local Creator Mode'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Storage Mode:</span>
                    <span className="font-mono text-emerald-400 text-[11px]">
                      {user ? 'Firestore Cloud Sync' : 'Browser Storage'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>AI Model:</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--accent-text)' }}>
                      gemini-3.8-flash
                    </span>
                  </div>
                </div>

                {!user && (
                  <button
                    onClick={onSignIn}
                    className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In with Google</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Core Tools Grid (6 Modules of YT-AI) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Production Pipeline Modules
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Six specialized studios engineered for modern YouTube creation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Sources */}
              <div
                onClick={() => setActivePage('sources')}
                className="group p-5 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Step 1
                    </span>
                  </div>
                  <h3 className="text-sm font-bold group-hover:text-red-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    Sources & Research Hub
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Collect, manage, and edit research articles, news stories, and transcripts to seed video script generation.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Sources &rarr;</span>
                </div>
              </div>

              {/* Card 2: Script Generator */}
              <div
                onClick={() => setActivePage('scripts')}
                className="group p-5 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                      <Clapperboard className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      Step 2
                    </span>
                  </div>
                  <h3 className="text-sm font-bold group-hover:text-red-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    AI Script Generator
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Draft timed scripts (24s–60s) across 12 content genres with segment breakdowns in Hindi, English, Gujarati, or Hinglish.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-red-400 group-hover:translate-x-1 transition-transform">
                  <span>Generate Scripts &rarr;</span>
                </div>
              </div>

              {/* Card 3: Video Prompt Builder */}
              <div
                onClick={() => setActivePage('video-prompts')}
                className="group p-5 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      <Film className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Step 3
                    </span>
                  </div>
                  <h3 className="text-sm font-bold group-hover:text-red-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    Video Prompt Builder
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Transform script segments 1:1 into cinematic Google Flow &amp; Veo visual prompts with camera motion and lighting presets.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>Build Prompts &rarr;</span>
                </div>
              </div>

              {/* Card 4: SEO Studio */}
              <div
                onClick={() => setActivePage('seo-studio')}
                className="group p-5 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Step 4
                    </span>
                  </div>
                  <h3 className="text-sm font-bold group-hover:text-red-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    YouTube SEO Studio
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Generate click-worthy YouTube titles, formatted descriptions, keyword tags strictly under 500 characters, and ranked hashtags.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Optimize SEO &rarr;</span>
                </div>
              </div>

              {/* Card 5: Thumbnail Studio */}
              <div
                onClick={() => setActivePage('thumbnail-studio')}
                className="group p-5 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Step 5
                    </span>
                  </div>
                  <h3 className="text-sm font-bold group-hover:text-red-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    Thumbnail Studio
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Design high-CTR 16:9 thumbnail concepts with composition directions, bold text overlays, and AI image prompts.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Create Thumbnails &rarr;</span>
                </div>
              </div>

              {/* Card 6: YT Editor */}
              <div
                onClick={() => setActivePage('yt-editor')}
                className="group p-5 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      Step 6
                    </span>
                  </div>
                  <h3 className="text-sm font-bold group-hover:text-red-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    YT Editor (Video Timeline)
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Assemble clips in a multi-track timeline with preview monitor, audio/video layers, text overlays, and real export.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-pink-400 group-hover:translate-x-1 transition-transform">
                  <span>Launch Timeline &rarr;</span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Studio Workflow Pipeline Bar */}
          <section
            className="p-6 rounded-2xl border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center space-x-2" style={{ color: 'var(--text-secondary)' }}>
              <ArrowRight className="w-4 h-4 text-red-500" />
              <span>YT-AI Creator Pipeline</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
              <button
                onClick={() => setActivePage('sources')}
                className="p-3 rounded-xl border hover:border-red-500/40 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
              >
                <FileText className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                <div className="font-semibold text-[11px]" style={{ color: 'var(--text-primary)' }}>1. Sources</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Research</div>
              </button>
              <button
                onClick={() => setActivePage('scripts')}
                className="p-3 rounded-xl border hover:border-red-500/40 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
              >
                <Clapperboard className="w-4 h-4 mx-auto mb-1 text-red-400" />
                <div className="font-semibold text-[11px]" style={{ color: 'var(--text-primary)' }}>2. Script</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>12 Modes</div>
              </button>
              <button
                onClick={() => setActivePage('video-prompts')}
                className="p-3 rounded-xl border hover:border-red-500/40 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
              >
                <Film className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                <div className="font-semibold text-[11px]" style={{ color: 'var(--text-primary)' }}>3. Prompts</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Google Flow</div>
              </button>
              <button
                onClick={() => setActivePage('seo-studio')}
                className="p-3 rounded-xl border hover:border-red-500/40 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
              >
                <Search className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <div className="font-semibold text-[11px]" style={{ color: 'var(--text-primary)' }}>4. SEO</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Tags &amp; Titles</div>
              </button>
              <button
                onClick={() => setActivePage('thumbnail-studio')}
                className="p-3 rounded-xl border hover:border-red-500/40 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
              >
                <ImageIcon className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <div className="font-semibold text-[11px]" style={{ color: 'var(--text-primary)' }}>5. Thumbnails</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>High CTR</div>
              </button>
              <button
                onClick={() => setActivePage('yt-editor')}
                className="p-3 rounded-xl border hover:border-red-500/40 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
              >
                <Scissors className="w-4 h-4 mx-auto mb-1 text-pink-400" />
                <div className="font-semibold text-[11px]" style={{ color: 'var(--text-primary)' }}>6. Timeline</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Video Editor</div>
              </button>
            </div>
          </section>

          {/* Cloud Storage & API Key Settings */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gemini API Key Box */}
            <div
              className="p-5 rounded-2xl border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Gemini API Configuration</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Powers AI generation for scripts, prompt matching, SEO metadata, and thumbnail concepts. Configure your Gemini API key or use server credentials.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setActivePage('api-keys')}
                  className="px-3.5 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-800/20 transition-all cursor-pointer"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  Configure API Key &rarr;
                </button>
              </div>
            </div>

            {/* Google Drive Export (Optional) */}
            <div
              className="p-5 rounded-2xl border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span>Google Drive Storyboard Export</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Save your generated video storyboard documents and scripts directly to Google Drive.
                </p>
              </div>
              <div className="pt-4">
                <DriveStatusCard onDriveStatusChange={setDriveConnected} />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 2. SOURCES PAGE */}
      {activePage === 'sources' && (
        <SourcesTab
          userId={effectiveUserId}
          onSelectForScript={handleSelectSourceForScript}
        />
      )}

      {/* 3. SCRIPT GENERATOR PAGE */}
      {activePage === 'scripts' && (
        <ScriptGeneratorTab
          userId={effectiveUserId}
          initialSourceId={selectedScriptSourceId}
          onNavigateToSources={() => setActivePage('sources')}
          onNavigateToConfig={() => setActivePage('api-keys')}
          onTransferToVideoPrompts={handleTransferToVideoPrompts}
          onTransferToSEOStudio={handleTransferToSEOStudio}
          onTransferToThumbnailStudio={(script, title, article) =>
            handleTransferToThumbnailStudio({ script, sourceTitle: title, sourceArticle: article })
          }
          onTransferToYTEditor={(script, title) =>
            handleTransferToYTEditor(script, title)
          }
        />
      )}

      {/* 4. VIDEO PROMPT BUILDER PAGE */}
      {activePage === 'video-prompts' && (
        <VideoPromptBuilderTab
          userId={effectiveUserId}
          transferredScript={transferredScript}
          transferredSourceTitle={transferredSourceTitle}
          onNavigateToScripts={() => setActivePage('scripts')}
          onNavigateToSources={() => setActivePage('sources')}
          onNavigateToOverview={() => setActivePage('overview')}
        />
      )}

      {/* 5. SEO STUDIO PAGE */}
      {activePage === 'seo-studio' && (
        <SEOStudioTab
          userId={effectiveUserId}
          transferredScript={transferredSEOScript}
          transferredSourceTitle={transferredSEOSourceTitle}
          transferredSourceArticle={transferredSEOSourceArticle}
          onNavigateToScripts={() => setActivePage('scripts')}
          onNavigateToSources={() => setActivePage('sources')}
          onTransferToThumbnailStudio={(params) =>
            handleTransferToThumbnailStudio(params)
          }
        />
      )}

      {/* 6. THUMBNAIL STUDIO PAGE */}
      {activePage === 'thumbnail-studio' && (
        <ThumbnailStudioTab
          userId={effectiveUserId}
          transferredScript={transferredThumbScript}
          transferredSourceTitle={transferredThumbSourceTitle}
          transferredSourceArticle={transferredThumbSourceArticle}
          transferredConcept={transferredThumbConcept}
          onNavigateToScripts={() => setActivePage('scripts')}
          onNavigateToSources={() => setActivePage('sources')}
        />
      )}

      {/* 7. YT EDITOR PAGE */}
      {activePage === 'yt-editor' && (
        <YTEditorTab
          userId={effectiveUserId}
          transferredScript={transferredEditorScript}
          transferredSourceTitle={transferredEditorSourceTitle}
          onNavigateToScripts={() => setActivePage('scripts')}
          onNavigateToSources={() => setActivePage('sources')}
        />
      )}

      {/* 8. API CONFIGURATION PAGE */}
      {activePage === 'api-keys' && (
        <div className="space-y-6">
          <GeminiConfigCard userId={effectiveUserId} />
        </div>
      )}

      {/* 9. SETTINGS PAGE */}
      {activePage === 'settings' && (
        <SettingsPage />
      )}
    </AppLayout>
  );
};
