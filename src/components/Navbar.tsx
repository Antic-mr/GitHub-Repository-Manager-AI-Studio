import React from 'react';
import { 
  Github, 
  Plus, 
  Sparkles, 
  LogOut, 
  Key, 
  ExternalLink, 
  Languages, 
  ShieldCheck, 
  FolderGit2, 
  Zap,
  User,
  Search
} from 'lucide-react';
import { AuthState } from '../types';
import { Language, translations } from '../translations';

interface NavbarProps {
  auth: AuthState;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenNewRepo: () => void;
  onToggleAiDrawer: () => void;
  lang: Language;
  onToggleLang: () => void;
  selectedRepoName: string | null;
  onClearSelectedRepo: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  auth,
  onOpenAuth,
  onLogout,
  onOpenNewRepo,
  onToggleAiDrawer,
  lang,
  onToggleLang,
  selectedRepoName,
  onClearSelectedRepo,
  searchQuery,
  onSearchChange,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & Repo Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button 
            id="brand-home-btn"
            onClick={onClearSelectedRepo}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 border border-slate-700/60 shadow-inner group-hover:border-indigo-500/50 transition-colors">
              <Github className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                <span>GitHub Manager</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI Pro</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{t.subtitle}</p>
            </div>
          </button>

          {selectedRepoName && (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-800 pl-3 ml-1">
              <button 
                onClick={onClearSelectedRepo} 
                className="hover:text-indigo-400 transition-colors flex items-center gap-1"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Repos</span>
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-200 truncate max-w-[200px]">{selectedRepoName}</span>
            </div>
          )}
        </div>

        {/* Center: Search (if on list view) */}
        {!selectedRepoName && (
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="navbar-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchRepos}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Right: Actions, Lang, Auth, Copilot */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Lang Toggle */}
          <button
            id="lang-toggle-btn"
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            title="تغییر زبان / Toggle Language"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'fa' ? 'English' : 'فارسی'}</span>
          </button>

          {/* AI Copilot Button */}
          <button
            id="ai-copilot-trigger-btn"
            onClick={onToggleAiDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/60 hover:border-indigo-600 transition-all shadow-sm group"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">{t.aiAssistant}</span>
          </button>

          {/* Create Repo (if authenticated) */}
          {auth.token && (
            <button
              id="nav-new-repo-btn"
              onClick={onOpenNewRepo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.newRepository}</span>
            </button>
          )}

          {/* User Auth Pill or Connect Button */}
          {auth.user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                <img
                  src={auth.user.avatar_url}
                  alt={auth.user.login}
                  className="w-7 h-7 rounded-full ring-1 ring-slate-700"
                />
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-none">{auth.user.name || auth.user.login}</div>
                  <div className="text-[10px] text-slate-400">@{auth.user.login}</div>
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={onLogout}
                title={t.logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="open-auth-modal-btn"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors shadow-sm"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{t.connectGithub}</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
