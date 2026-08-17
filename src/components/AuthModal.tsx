import React, { useState } from 'react';
import { 
  Key, 
  Github, 
  ExternalLink, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Eye, 
  EyeOff, 
  Globe, 
  HelpCircle 
} from 'lucide-react';
import { Language, translations } from '../translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectToken: (token: string) => Promise<void>;
  onConnectOAuth: () => Promise<void>;
  onExploreDemo: () => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onConnectToken,
  onConnectOAuth,
  onExploreDemo,
  lang,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'token' | 'oauth' | 'demo'>('token');

  const t = translations[lang];

  if (!isOpen) return null;

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please enter a valid GitHub token.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConnectToken(tokenInput.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check token permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await onConnectOAuth();
      onClose();
    } catch (err: any) {
      setError(err.message || 'OAuth login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.connectGithub}</h2>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1">
          <button
            id="auth-tab-pat"
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'token'
                ? 'bg-slate-800 text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Personal Access Token</span>
          </button>

          <button
            id="auth-tab-oauth"
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'bg-slate-800 text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub OAuth</span>
          </button>

          <button
            id="auth-tab-demo"
            onClick={() => setActiveTab('demo')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'demo'
                ? 'bg-slate-800 text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.demoMode}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'token' && (
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>GitHub Personal Access Token (PAT)</span>
                  <a
                    href="https://github.com/settings/tokens/new?description=GitHub+Manager+AI&scopes=repo,workflow,user,read:org"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                  >
                    <span>{t.generateTokenLink}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="relative">
                  <input
                    id="pat-token-input"
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxx"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  {t.tokenHelp}
                </p>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Security & Privacy</span>
                </div>
                <p>Your token stays exclusively inside your browser session to communicate directly with GitHub API. It is never logged or exposed.</p>
              </div>

              <button
                id="submit-pat-btn"
                type="submit"
                disabled={loading || !tokenInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>{t.connectTokenBtn}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center text-slate-200 border border-slate-700">
                  <Github className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">OAuth Instant Sign-In</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.oauthHelp}</p>
                </div>
              </div>

              <button
                id="oauth-login-btn"
                onClick={handleOAuthClick}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-white text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    <span>{t.connectOauthBtn}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'demo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>Public Repositories Explorer</span>
                </h3>
                <p className="text-slate-400">
                  Browse public open-source GitHub repositories without logging in. You can inspect files, view branches, commits, and use AI features.
                </p>
              </div>

              <button
                id="start-demo-btn"
                onClick={() => {
                  onExploreDemo();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4" />
                <span>Start Exploring in Demo Mode</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
