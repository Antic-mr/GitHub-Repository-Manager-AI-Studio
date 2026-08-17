import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RepoList } from './components/RepoList';
import { RepoDetail } from './components/RepoDetail';
import { AuthModal } from './components/AuthModal';
import { CreateRepoModal } from './components/CreateRepoModal';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { GitHubRepo, AuthState } from './types';
import { githubApi } from './services/githubApi';
import { Language } from './translations';

const STORAGE_KEY_TOKEN = 'gh_manager_token';
const STORAGE_KEY_LANG = 'gh_manager_lang';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEY_LANG) as Language) || 'fa';
  });

  const [auth, setAuth] = useState<AuthState>({
    token: null,
    mode: 'demo',
    user: null,
  });

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNewRepoModalOpen, setIsNewRepoModalOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Set RTL or LTR document direction according to language
  useEffect(() => {
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  }, [lang]);

  // Load saved token on startup
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedToken) {
      connectWithToken(savedToken);
    } else {
      loadPublicRepos();
    }
  }, []);

  // Listen for OAuth postMessage events from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data.token) {
        const token = event.data.token;
        const user = event.data.user;
        githubApi.setToken(token);
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        setAuth({
          token,
          mode: 'oauth',
          user: user || null,
        });
        loadUserRepos(token);
        setIsAuthModalOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const connectWithToken = async (token: string) => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      githubApi.setToken(token);
      const user = await githubApi.getAuthenticatedUser();
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      setAuth({
        token,
        mode: 'pat',
        user,
      });
      await loadUserRepos(token);
    } catch (err: any) {
      console.error('Token authentication failed:', err);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      githubApi.setToken(null);
      setAuth({ token: null, mode: 'demo', user: null });
      setRepoError(err.message || 'Token authentication failed. Please check permissions.');
      loadPublicRepos();
      throw err;
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const connectWithOAuth = async () => {
    try {
      const res = await fetch('/api/auth/github-url');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start GitHub OAuth');
      }
      const { url } = await res.json();
      const popup = window.open(
        url,
        'github_oauth_popup',
        'width=600,height=750,menubar=no,toolbar=no,status=no'
      );
      if (!popup) {
        throw new Error('Please allow popups to connect with GitHub.');
      }
    } catch (err: any) {
      throw err;
    }
  };

  const loadUserRepos = async (token: string) => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      githubApi.setToken(token);
      const userRepos = await githubApi.getUserRepos({ per_page: 100, sort: 'updated' });
      setRepos(userRepos);
    } catch (err: any) {
      setRepoError(err.message || 'Failed to load user repositories.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const loadPublicRepos = async () => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      githubApi.setToken(null);
      // Load top developer repositories for exploration
      const searchRes = await githubApi.searchRepos('stars:>10000', 'stars');
      setRepos(searchRes.items || []);
    } catch (err: any) {
      setRepoError('Failed to load repositories. You can connect with your personal GitHub account.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    githubApi.setToken(null);
    setAuth({
      token: null,
      mode: 'demo',
      user: null,
    });
    setSelectedRepo(null);
    loadPublicRepos();
  };

  const handleCreateRepo = async (data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }) => {
    const newRepo = await githubApi.createRepo(data);
    setRepos((prev) => [newRepo, ...prev]);
    setSelectedRepo(newRepo);
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'fa' ? 'en' : 'fa'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        auth={auth}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenNewRepo={() => setIsNewRepoModalOpen(true)}
        onToggleAiDrawer={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
        lang={lang}
        onToggleLang={toggleLanguage}
        selectedRepoName={selectedRepo ? selectedRepo.name : null}
        onClearSelectedRepo={() => setSelectedRepo(null)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {selectedRepo ? (
          <RepoDetail
            repo={selectedRepo}
            auth={auth}
            onBack={() => setSelectedRepo(null)}
            lang={lang}
            onRepoUpdated={() => {
              if (auth.token) loadUserRepos(auth.token);
            }}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        ) : (
          <RepoList
            repos={repos}
            isLoading={isLoadingRepos}
            error={repoError}
            onSelectRepo={(r) => setSelectedRepo(r)}
            onOpenNewRepo={() => setIsNewRepoModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            auth={auth}
            lang={lang}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onConnectToken={connectWithToken}
        onConnectOAuth={connectWithOAuth}
        onExploreDemo={() => {
          handleLogout();
        }}
        lang={lang}
      />

      {/* Create Repo Modal */}
      <CreateRepoModal
        isOpen={isNewRepoModalOpen}
        onClose={() => setIsNewRepoModalOpen(false)}
        onCreate={handleCreateRepo}
        lang={lang}
      />

      {/* AI Copilot Drawer */}
      <AiCopilotDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        selectedRepo={selectedRepo}
        lang={lang}
      />
    </div>
  );
}
