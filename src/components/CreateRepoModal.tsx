import React, { useState } from 'react';
import { 
  FolderPlus, 
  Lock, 
  Globe, 
  X, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import { Language, translations } from '../translations';

interface CreateRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }) => Promise<void>;
  lang: Language;
}

const GITIGNORE_TEMPLATES = [
  'Node',
  'Python',
  'Go',
  'Rust',
  'Java',
  'C++',
  'React',
  'Unity',
  'Swift',
];

const LICENSE_TEMPLATES = [
  { key: 'mit', label: 'MIT License' },
  { key: 'apache-2.0', label: 'Apache License 2.0' },
  { key: 'gpl-3.0', label: 'GNU General Public License v3.0' },
  { key: 'bsd-3-clause', label: 'BSD 3-Clause "New" or "Revised"' },
  { key: 'unlicense', label: 'The Unlicense' },
];

export const CreateRepoModal: React.FC<CreateRepoModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  lang,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [gitignore, setGitignore] = useState('');
  const [license, setLicense] = useState('mit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a repository name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onCreate({
        name: name.trim().replace(/\s+/g, '-'),
        description: description.trim() || undefined,
        private: isPrivate,
        auto_init: autoInit,
        gitignore_template: gitignore || undefined,
        license_template: license || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create repository on GitHub.');
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
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800/60 text-emerald-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t.newRepository}</h2>
              <p className="text-xs text-slate-400">Create a repository on your GitHub account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Repo Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              {t.repoName} *
            </label>
            <input
              id="create-repo-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. awesome-ai-project"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">Great repository names are short and memorable.</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              {t.repoDesc}
            </label>
            <textarea
              id="create-repo-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of what this project does..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Visibility selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              {t.visibility}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="vis-public-btn"
                onClick={() => setIsPrivate(false)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  !isPrivate
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Globe className={`w-4 h-4 mt-0.5 ${!isPrivate ? 'text-indigo-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-semibold">{t.public}</div>
                  <div className="text-[10px] text-slate-400">Anyone on internet can view</div>
                </div>
              </button>

              <button
                type="button"
                id="vis-private-btn"
                onClick={() => setIsPrivate(true)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  isPrivate
                    ? 'bg-amber-950/40 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Lock className={`w-4 h-4 mt-0.5 ${isPrivate ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-semibold">{t.private}</div>
                  <div className="text-[10px] text-slate-400">Only you choose who can commit</div>
                </div>
              </button>
            </div>
          </div>

          {/* Initialization options */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                id="init-readme-checkbox"
                type="checkbox"
                checked={autoInit}
                onChange={(e) => setAutoInit(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-300">{t.initReadme}</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {t.gitignoreTemplate}
                </label>
                <select
                  id="create-repo-gitignore-select"
                  value={gitignore}
                  onChange={(e) => setGitignore(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None</option>
                  {GITIGNORE_TEMPLATES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {t.license}
                </label>
                <select
                  id="create-repo-license-select"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None</option>
                  {LICENSE_TEMPLATES.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-repo-btn"
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>{t.createRepoBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
