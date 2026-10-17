import React from 'react';
import { type User } from 'firebase/auth';
import { Menu, Sun, Moon, Sparkles, LogIn, User as UserIcon } from 'lucide-react';
import { NAVIGATION_ITEMS, type NavigationPageId } from '../../navigation.ts';
import { useTheme } from '../../theme/ThemeContext.tsx';

interface TopBarProps {
  user: User | null;
  activePage: NavigationPageId;
  onOpenMobileDrawer: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  activePage,
  onOpenMobileDrawer,
  onSignIn,
}) => {
  const { resolvedMode, toggleMode, currentPresetDef } = useTheme();
  const currentItem = NAVIGATION_ITEMS.find((item) => item.id === activePage) || NAVIGATION_ITEMS[0];

  return (
    <header
      className="h-16 border-b px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Left: Mobile Menu Button & Breadcrumb */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={onOpenMobileDrawer}
          className="md:hidden p-2 rounded-xl border text-xs cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center space-x-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            <span className="font-bold text-red-500">YT-AI</span>
            <span>/</span>
            <span style={{ color: 'var(--accent-primary)' }}>{currentItem.label}</span>
          </div>
          <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {currentItem.label}
          </h1>
        </div>
      </div>

      {/* Right Controls: Model Badge, Theme Preset indicator, Sign In status, Theme toggle */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Model Badge */}
        <div
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border"
          style={{
            backgroundColor: 'var(--bg-base)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
          <span>gemini-3.8-flash</span>
        </div>

        {/* Preset Name Pill */}
        <div
          className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
          style={{
            backgroundColor: 'var(--accent-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent-primary)',
          }}
        >
          <Sparkles className="w-3 h-3" />
          <span>{currentPresetDef.name}</span>
        </div>

        {/* Auth status action in TopBar */}
        {user ? (
          <div
            className="flex items-center space-x-2 px-2.5 py-1 rounded-xl border text-xs"
            style={{
              backgroundColor: 'var(--bg-base)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-5 h-5 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-[11px] font-medium hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
              {user.displayName?.split(' ')[0] || 'Connected'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Cloud Sync Active" />
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In with Google</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        )}

        {/* Dark/Light Quick Toggle */}
        <button
          onClick={toggleMode}
          title={`Switch to ${resolvedMode === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-xl border text-xs transition-colors cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Toggle theme mode"
        >
          {resolvedMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      </div>
    </header>
  );
};
