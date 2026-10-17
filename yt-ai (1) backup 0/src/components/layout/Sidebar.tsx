import React from 'react';
import { type User } from 'firebase/auth';
import {
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  User as UserIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { NAVIGATION_ITEMS, type NavigationPageId } from '../../navigation.ts';
import { useTheme } from '../../theme/ThemeContext.tsx';

interface SidebarProps {
  user: User | null;
  activePage: NavigationPageId;
  onSelectPage: (id: NavigationPageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut: () => void;
  onSignIn?: () => void;
  signingOut: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activePage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  onSignOut,
  onSignIn,
  signingOut,
}) => {
  const { resolvedMode, toggleMode } = useTheme();

  return (
    <aside
      className={`hidden md:flex flex-col border-r transition-all duration-300 z-30 select-none relative backdrop-blur-xl h-screen sticky top-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Sidebar Header / Logo */}
      <div
        className="h-16 flex items-center px-4 border-b justify-between"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div
            className="h-10 w-10 min-w-10 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Clapperboard className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight truncate flex items-center space-x-1.5" style={{ color: 'var(--text-primary)' }}>
                <span>YT-AI</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                  STUDIO
                </span>
              </h1>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                YouTube AI Video Suite
              </p>
            </div>
          )}
        </div>

        {/* Collapse / Expand toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-lg border text-xs transition-colors hover:bg-slate-800/20 cursor-pointer"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              title={collapsed ? `${item.label} — ${item.description}` : undefined}
              className={`w-full flex items-center rounded-xl transition-all text-xs font-medium cursor-pointer relative group ${
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5 space-x-3'
              } ${
                isActive
                  ? 'text-white shadow-md font-semibold'
                  : 'hover:bg-slate-800/20 text-slate-400 hover:text-slate-200'
              }`}
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-white"
                />
              )}

              <Icon className="w-4 h-4 flex-shrink-0" />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div
        className="p-3 border-t space-y-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {/* Quick Theme Toggle Button */}
        <button
          onClick={toggleMode}
          title={`Switch to ${resolvedMode === 'dark' ? 'Light' : 'Dark'} mode`}
          className={`w-full flex items-center rounded-xl border p-2 text-xs transition-colors hover:bg-slate-800/10 cursor-pointer ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="flex items-center space-x-2">
            {resolvedMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
            {!collapsed && <span>{resolvedMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-mono capitalize" style={{ color: 'var(--text-muted)' }}>
              {resolvedMode}
            </span>
          )}
        </button>

        {/* User Card & Sign In / Out */}
        {user ? (
          <div
            className={`rounded-xl border p-2 flex items-center ${
              collapsed ? 'justify-center' : 'justify-between space-x-2'
            }`}
            style={{
              backgroundColor: 'var(--bg-base)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center space-x-2.5 overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  style={{
                    backgroundColor: 'var(--accent-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <UserIcon className="w-4 h-4" />
                </div>
              )}

              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {user.displayName || 'Google Account'}
                  </div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {user.email}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={onSignOut}
                disabled={signingOut}
                title="Sign Out"
                className="p-1.5 rounded-lg border text-xs hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer flex-shrink-0"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div
            className={`rounded-xl border p-2 flex items-center ${
              collapsed ? 'justify-center' : 'justify-between space-x-2'
            }`}
            style={{
              backgroundColor: 'var(--bg-base)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  Local Creator Mode
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  Browser Storage
                </div>
              </div>
            )}
            <button
              onClick={onSignIn}
              title="Sign in with Google"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <LogIn className="w-3.5 h-3.5" />
              {!collapsed && <span>Sign In</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
