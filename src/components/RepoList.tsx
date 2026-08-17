import React, { useState, useMemo } from 'react';
import { 
  FolderGit2, 
  Star, 
  GitFork, 
  Lock, 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  ArrowUpDown,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { GitHubRepo, AuthState } from '../types';
import { Language, translations } from '../translations';

interface RepoListProps {
  repos: GitHubRepo[];
  isLoading: boolean;
  error: string | null;
  onSelectRepo: (repo: GitHubRepo) => void;
  onOpenNewRepo: () => void;
  onOpenAuth: () => void;
  auth: AuthState;
  lang: Language;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Vue: '#41b883',
  Shell: '#89e051',
};

export const RepoList: React.FC<RepoListProps> = ({
  repos,
  isLoading,
  error,
  onSelectRepo,
  onOpenNewRepo,
  onOpenAuth,
  auth,
  lang,
  searchQuery,
  onSearchChange,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'forks'>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'stars' | 'name'>('updated');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const t = translations[lang];

  // Available unique languages in repo list
  const languages = useMemo(() => {
    const set = new Set<string>();
    repos.forEach((r) => {
      if (r.language) set.add(r.language);
    });
    return Array.from(set).sort();
  }, [repos]);

  // Filtered & Sorted repositories
  const filteredRepos = useMemo(() => {
    return repos
      .filter((repo) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = repo.name.toLowerCase().includes(q) || repo.full_name.toLowerCase().includes(q);
          const matchesDesc = repo.description ? repo.description.toLowerCase().includes(q) : false;
          if (!matchesName && !matchesDesc) return false;
        }

        // Type filter
        if (filterType === 'public' && repo.private) return false;
        if (filterType === 'private' && !repo.private) return false;
        if (filterType === 'forks' && !repo.fork) return false;

        // Language filter
        if (selectedLanguage !== 'all' && repo.language !== selectedLanguage) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'updated') {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        if (sortBy === 'stars') {
          return b.stargazers_count - a.stargazers_count;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [repos, searchQuery, filterType, selectedLanguage, sortBy]);

  const handleCopyClone = (e: React.MouseEvent, repo: GitHubRepo) => {
    e.stopPropagation();
    navigator.clipboard.writeText(repo.html_url + '.git');
    setCopiedId(repo.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Banner / Quick Stats */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {auth.user ? `${auth.user.name || auth.user.login}'s Repositories` : t.appTitle}
            </h1>
            {auth.token ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {t.demoMode}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {auth.token ? (
            <button
              id="header-create-repo-btn"
              onClick={onOpenNewRepo}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newRepository}</span>
            </button>
          ) : (
            <button
              id="header-auth-btn"
              onClick={onOpenAuth}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>{t.connectGithub}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto">
          {(['all', 'public', 'private', 'forks'] as const).map((type) => (
            <button
              key={type}
              id={`filter-tab-${type}`}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filterType === type
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'all' && t.allRepos}
              {type === 'public' && t.publicRepos}
              {type === 'private' && t.privateRepos}
              {type === 'forks' && t.forks}
            </button>
          ))}
        </div>

        {/* Search, Language & Sort */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box on mobile / tablet */}
          <div className="relative flex-1 sm:w-60 lg:hidden">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchRepos}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Language Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="filter-lang-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Languages</option>
              {languages.map((l) => (
                <option key={l} value={l} className="bg-slate-900 text-slate-200">{l}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="updated" className="bg-slate-900 text-slate-200">{t.updated}</option>
              <option value="stars" className="bg-slate-900 text-slate-200">{t.stars}</option>
              <option value="name" className="bg-slate-900 text-slate-200">{t.name}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading repositories from GitHub...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3 my-6">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 font-semibold transition-colors"
          >
            Update Token
          </button>
        </div>
      )}

      {/* Repositories Grid */}
      {!isLoading && !error && filteredRepos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.map((repo) => {
            const langColor = repo.language ? LANGUAGE_COLORS[repo.language] || '#94a3b8' : null;

            return (
              <div
                key={repo.id}
                id={`repo-card-${repo.id}`}
                onClick={() => onSelectRepo(repo)}
                className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-indigo-500/5 hover:-translate-y-0.5"
              >
                <div>
                  {/* Top row: Name & Visibility Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderGit2 className="w-4 h-4 text-indigo-400 shrink-0 group-hover:text-indigo-300 transition-colors" />
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                        {repo.name}
                      </h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                      repo.private
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-1'
                        : 'bg-slate-800 text-slate-300 border-slate-700 flex items-center gap-1'
                    }`}>
                      {repo.private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                      <span>{repo.private ? t.private : t.public}</span>
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4 leading-relaxed">
                    {repo.description || 'No description provided.'}
                  </p>

                  {/* Topics Tags */}
                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {repo.topics.slice(0, 3).map((topic) => (
                        <span key={topic} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-900/50">
                          {topic}
                        </span>
                      ))}
                      {repo.topics.length > 3 && (
                        <span className="text-[10px] text-slate-500 self-center">+{repo.topics.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Language, Stars, Forks, Date & Quick Copy */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    {repo.language && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: langColor || '#cbd5e1' }}
                        />
                        <span className="text-slate-300 text-[11px]">{repo.language}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-slate-400" title="Stars">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span>{repo.stargazers_count}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400" title="Forks">
                      <GitFork className="w-3 h-3 text-slate-400" />
                      <span>{repo.forks_count}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`copy-clone-${repo.id}`}
                      onClick={(e) => handleCopyClone(e, repo)}
                      title="Copy clone URL"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {copiedId === repo.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in GitHub"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredRepos.length === 0 && (
        <div className="py-16 px-4 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 max-w-lg mx-auto">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">{t.noReposFound}</h3>
          <p className="text-xs text-slate-400 mb-6">{t.createFirstRepo}</p>

          <div className="flex items-center justify-center gap-3">
            {auth.token ? (
              <button
                onClick={onOpenNewRepo}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t.newRepository}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <FolderGit2 className="w-4 h-4" />
                <span>{t.connectGithub}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
