import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  GitBranch, 
  GitCommit, 
  AlertCircle, 
  GitPullRequest, 
  PlayCircle, 
  Sparkles, 
  Settings, 
  ExternalLink, 
  Copy, 
  Check, 
  Star, 
  GitFork, 
  ArrowLeft, 
  FileCode, 
  Folder, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit3, 
  Save, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Send, 
  Code2, 
  ShieldAlert, 
  FileDiff,
  Terminal,
  Lock,
  Globe
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  GitHubRepo, 
  GitHubBranch, 
  GitHubCommit, 
  GitHubContentItem, 
  GitHubIssue, 
  GitHubPullRequest, 
  GitHubWorkflow, 
  GitHubWorkflowRun,
  AuthState
} from '../types';
import { githubApi } from '../services/githubApi';
import { generateCommitMessage, generateReadme, reviewCode, CodeReviewResult } from '../services/aiApi';
import { Language, translations } from '../translations';

interface RepoDetailProps {
  repo: GitHubRepo;
  auth: AuthState;
  onBack: () => void;
  lang: Language;
  onRepoUpdated?: () => void;
  onOpenAuth?: () => void;
}

export const RepoDetail: React.FC<RepoDetailProps> = ({
  repo,
  auth,
  onBack,
  lang,
  onRepoUpdated,
  onOpenAuth,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'code' | 'commits' | 'issues' | 'pulls' | 'actions' | 'ai-tools' | 'settings'>('code');
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(repo.default_branch || 'main');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [contents, setContents] = useState<GitHubContentItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitHubContentItem | null>(null);
  const [fileRawContent, setFileRawContent] = useState<string>('');
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  // Editing file state
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [commitMsgBuffer, setCommitMsgBuffer] = useState('');
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isGeneratingCommitMsg, setIsGeneratingCommitMsg] = useState(false);

  // Commits state
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null);

  // Issues state
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [issueStateFilter, setIssueStateFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [issueComments, setIssueComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueBody, setNewIssueBody] = useState('');

  // Pull requests state
  const [pulls, setPulls] = useState<GitHubPullRequest[]>([]);

  // Actions & Workflows state
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<GitHubWorkflowRun[]>([]);
  const [selectedWorkflowForRun, setSelectedWorkflowForRun] = useState<GitHubWorkflow | null>(null);

  // AI Tools state
  const [aiGeneratedReadme, setAiGeneratedReadme] = useState<string | null>(null);
  const [aiGeneratingReadme, setAiGeneratingReadme] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<CodeReviewResult | null>(null);
  const [aiReviewingCode, setAiReviewingCode] = useState(false);

  // General UI state
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedClone, setCopiedClone] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);

  const owner = repo.owner.login;
  const repoName = repo.name;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial Load: branches, root contents, readme
  useEffect(() => {
    loadBranches();
    loadContents('');
  }, [repo.id]);

  // Load branch-dependent content
  useEffect(() => {
    if (activeTab === 'code') {
      loadContents(currentPath);
    } else if (activeTab === 'commits') {
      loadCommits();
    } else if (activeTab === 'issues') {
      loadIssues();
    } else if (activeTab === 'pulls') {
      loadPulls();
    } else if (activeTab === 'actions') {
      loadWorkflows();
    }
  }, [activeTab, selectedBranch]);

  const loadBranches = async () => {
    try {
      const data = await githubApi.getBranches(owner, repoName);
      setBranches(data);
      if (data.length > 0 && !data.some(b => b.name === selectedBranch)) {
        setSelectedBranch(data[0].name);
      }
    } catch (e) {
      console.error('Error fetching branches:', e);
    }
  };

  const loadContents = async (path: string) => {
    setIsLoading(true);
    setContentError(null);
    try {
      const data = await githubApi.getContents(owner, repoName, path, selectedBranch);
      if (Array.isArray(data)) {
        // Sort directories first, then files
        const sorted = data.sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        setContents(sorted);
        setSelectedFile(null);
        setFileRawContent('');

        // Load README safely on root path
        if (path === '') {
          loadRootReadme();
        }
      } else {
        // Single file selected from API
        await loadSingleFile(data);
      }
      setCurrentPath(path);
    } catch (e: any) {
      console.error('Error loading contents:', e);
      setContentError(e.message || 'Error loading directory contents');
      showToast(e.message || 'Error loading directory contents');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRootReadme = async () => {
    try {
      const readmeText = await githubApi.getReadme(owner, repoName, selectedBranch);
      setReadmeContent(readmeText);
    } catch {
      setReadmeContent(null);
    }
  };

  const loadSingleFile = async (item: GitHubContentItem) => {
    setIsLoading(true);
    setSelectedFile(item);
    setIsEditingFile(false);
    try {
      const text = await githubApi.getFileContent(owner, repoName, item.path, selectedBranch);
      setFileRawContent(text);
      setEditBuffer(text);
    } catch (e: any) {
      console.error('Error loading file:', e);
      const msg = `Failed to load file content: ${e.message || 'Unknown error'}`;
      setFileRawContent(msg);
      setEditBuffer(msg);
      showToast(e.message || 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (item: GitHubContentItem) => {
    if (item.type === 'dir') {
      loadContents(item.path);
    } else {
      loadSingleFile(item);
    }
  };

  const handleBreadcrumbClick = (index: number, parts: string[]) => {
    if (index === -1) {
      loadContents('');
    } else {
      const newPath = parts.slice(0, index + 1).join('/');
      loadContents(newPath);
    }
  };

  // Commit changes to file
  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setIsSavingFile(true);
    try {
      const message = commitMsgBuffer.trim() || `Update ${selectedFile.name}`;
      await githubApi.createOrUpdateFile(
        owner,
        repoName,
        selectedFile.path,
        editBuffer,
        message,
        selectedFile.sha,
        selectedBranch
      );
      setFileRawContent(editBuffer);
      setIsEditingFile(false);
      setCommitMsgBuffer('');
      showToast(t.fileSavedSuccess);
      loadContents(currentPath);
    } catch (e: any) {
      showToast(e.message || 'Failed to commit file.');
    } finally {
      setIsSavingFile(false);
    }
  };

  // AI commit message generator
  const handleAiCommitMsg = async () => {
    setIsGeneratingCommitMsg(true);
    try {
      const diff = `File: ${selectedFile?.name}\n\nModified content snippet:\n${editBuffer.substring(0, 1000)}`;
      const res = await generateCommitMessage(diff, `Update ${selectedFile?.name}`, lang);
      setCommitMsgBuffer(res.title);
    } catch (e: any) {
      showToast('AI commit generation failed.');
    } finally {
      setIsGeneratingCommitMsg(false);
    }
  };

  // Load Commits
  const loadCommits = async () => {
    setIsLoading(true);
    try {
      const data = await githubApi.getCommits(owner, repoName, selectedBranch);
      setCommits(data);
      setSelectedCommit(null);
    } catch (e: any) {
      console.error('Error loading commits:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCommitDetail = async (commit: GitHubCommit) => {
    try {
      const detail = await githubApi.getCommitDetail(owner, repoName, commit.sha);
      setSelectedCommit(detail);
    } catch (e: any) {
      showToast('Could not load commit details');
    }
  };

  // Load Issues
  const loadIssues = async () => {
    setIsLoading(true);
    try {
      const data = await githubApi.getIssues(owner, repoName, issueStateFilter);
      setIssues(data);
      setSelectedIssue(null);
    } catch (e: any) {
      console.error('Error loading issues:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIssue = async (issue: GitHubIssue) => {
    setSelectedIssue(issue);
    try {
      const comments = await githubApi.getIssueComments(owner, repoName, issue.number);
      setIssueComments(comments);
    } catch (e) {
      setIssueComments([]);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;
    try {
      const newIssue = await githubApi.createIssue(owner, repoName, newIssueTitle.trim(), newIssueBody.trim());
      setIsCreatingIssue(false);
      setNewIssueTitle('');
      setNewIssueBody('');
      showToast(t.issueCreatedSuccess);
      loadIssues();
    } catch (e: any) {
      showToast(e.message || 'Failed to create issue.');
    }
  };

  const handleToggleIssueState = async (issue: GitHubIssue) => {
    const nextState = issue.state === 'open' ? 'closed' : 'open';
    try {
      const updated = await githubApi.updateIssueState(owner, repoName, issue.number, nextState);
      setSelectedIssue(updated);
      showToast(nextState === 'closed' ? 'Issue closed' : 'Issue reopened');
      loadIssues();
    } catch (e: any) {
      showToast('Failed to update issue status.');
    }
  };

  const handleAddComment = async () => {
    if (!selectedIssue || !newCommentText.trim()) return;
    try {
      await githubApi.addIssueComment(owner, repoName, selectedIssue.number, newCommentText.trim());
      setNewCommentText('');
      const comments = await githubApi.getIssueComments(owner, repoName, selectedIssue.number);
      setIssueComments(comments);
      showToast('Comment added!');
    } catch (e: any) {
      showToast('Failed to add comment.');
    }
  };

  // Load PRs
  const loadPulls = async () => {
    setIsLoading(true);
    try {
      const data = await githubApi.getPullRequests(owner, repoName, 'all');
      setPulls(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Actions & Workflows
  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const [wfRes, runsRes] = await Promise.all([
        githubApi.getWorkflows(owner, repoName).catch(() => ({ workflows: [], total_count: 0 })),
        githubApi.getWorkflowRuns(owner, repoName).catch(() => ({ workflow_runs: [], total_count: 0 }))
      ]);
      setWorkflows(wfRes.workflows || []);
      setWorkflowRuns(runsRes.workflow_runs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatchWorkflow = async (workflow: GitHubWorkflow) => {
    try {
      await githubApi.dispatchWorkflow(owner, repoName, workflow.id, selectedBranch);
      showToast(`Triggered workflow: ${workflow.name}`);
      setTimeout(loadWorkflows, 2000);
    } catch (e: any) {
      showToast(e.message || 'Failed to dispatch workflow.');
    }
  };

  // AI README Generator
  const handleGenerateAiReadme = async () => {
    setAiGeneratingReadme(true);
    try {
      const readme = await generateReadme(
        repo.name,
        repo.description || '',
        repo.language || 'TypeScript, Node.js',
        'Interactive repository manager with AI assistant and GitHub API integration',
        lang
      );
      setAiGeneratedReadme(readme);
    } catch (e: any) {
      showToast('Failed to generate AI README.');
    } finally {
      setAiGeneratingReadme(false);
    }
  };

  // AI Code Review
  const handleReviewSelectedFile = async () => {
    if (!selectedFile || !fileRawContent) return;
    setAiReviewingCode(true);
    try {
      const res = await reviewCode(selectedFile.name, fileRawContent);
      setAiReviewResult(res);
    } catch (e: any) {
      showToast('Code review failed.');
    } finally {
      setAiReviewingCode(false);
    }
  };

  // Delete repo
  const handleDeleteRepo = async () => {
    if (deleteConfirmName !== repo.name) return;
    setIsDeletingRepo(true);
    try {
      await githubApi.deleteRepo(owner, repoName);
      showToast(t.deleteSuccess);
      if (onRepoUpdated) onRepoUpdated();
      onBack();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete repository.');
    } finally {
      setIsDeletingRepo(false);
    }
  };

  const pathParts = currentPath ? currentPath.split('/') : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fadeIn">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header: Back + Repo Identity + Actions */}
      <div className="mb-6 pb-6 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="back-to-repos-btn"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Back to repositories"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-sm">{repo.owner.login}</span>
              <span className="text-slate-600">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                {repo.name}
              </h1>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                repo.private
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-1'
                  : 'bg-slate-800 text-slate-300 border-slate-700 flex items-center gap-1'
              }`}>
                {repo.private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                <span>{repo.private ? t.private : t.public}</span>
              </span>
            </div>

            {repo.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{repo.description}</p>
            )}
          </div>
        </div>

        {/* Quick Stats & Clone */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Branch Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <select
              id="branch-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name} className="bg-slate-900 text-slate-200">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Copy Clone URL */}
          <button
            id="copy-clone-btn"
            onClick={() => {
              navigator.clipboard.writeText(repo.html_url + '.git');
              setCopiedClone(true);
              setTimeout(() => setCopiedClone(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            {copiedClone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedClone ? t.copied : t.clone}</span>
          </button>

          {/* View on GitHub */}
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">{t.viewOnGithub}</span>
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-px mb-6 overflow-x-auto">
        {[
          { key: 'code', label: t.codeTab, icon: FileCode },
          { key: 'commits', label: t.commitsTab, icon: GitCommit },
          { key: 'issues', label: `${t.issuesTab} (${repo.open_issues_count})`, icon: AlertCircle },
          { key: 'pulls', label: t.pullsTab, icon: GitPullRequest },
          { key: 'actions', label: t.actionsTab, icon: PlayCircle },
          { key: 'ai-tools', label: t.aiToolsTab, icon: Sparkles },
          { key: 'settings', label: t.settingsTab, icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: CODE & FILE EXPLORER */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          {/* Breadcrumbs & Actions */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 overflow-x-auto py-1">
              <button
                id="breadcrumb-root"
                onClick={() => handleBreadcrumbClick(-1, pathParts)}
                className="hover:text-indigo-400 font-semibold text-slate-200"
              >
                {repo.name}
              </button>
              {pathParts.map((part, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-slate-600">/</span>
                  <button
                    onClick={() => handleBreadcrumbClick(idx, pathParts)}
                    className="hover:text-indigo-400 font-medium text-slate-300"
                  >
                    {part}
                  </button>
                </React.Fragment>
              ))}
              {selectedFile && (
                <>
                  <span className="text-slate-600">/</span>
                  <span className="font-semibold text-indigo-400">{selectedFile.name}</span>
                </>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2">
                <button
                  id="ai-review-file-btn"
                  onClick={handleReviewSelectedFile}
                  disabled={aiReviewingCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/70 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{aiReviewingCode ? t.generating : t.aiCodeReview}</span>
                </button>

                {auth.token && (
                  <button
                    id="edit-file-btn"
                    onClick={() => setIsEditingFile(!isEditingFile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingFile ? 'Cancel Edit' : t.editFile}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* AI Code Review Overlay Card if requested */}
          {aiReviewResult && selectedFile && (
            <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white">AI Code Review: {selectedFile.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Quality Score: {aiReviewResult.score}/100
                  </span>
                </div>
                <button onClick={() => setAiReviewResult(null)} className="text-slate-400 hover:text-white text-xs">
                  Close
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{aiReviewResult.summary}</p>
              {aiReviewResult.persianSummary && (
                <p className="text-xs text-indigo-200/90 leading-relaxed font-sans">{aiReviewResult.persianSummary}</p>
              )}

              {aiReviewResult.improvements.length > 0 && (
                <div className="space-y-2 mt-3">
                  <h5 className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Suggestions:</h5>
                  {aiReviewResult.improvements.map((imp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                      <div className="font-semibold text-amber-300 flex items-center gap-2">
                        <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {imp.type}
                        </span>
                        <span>{imp.title}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{imp.description}</p>
                      {imp.suggestedFix && (
                        <pre className="p-2 rounded bg-slate-950 font-mono text-[10px] text-emerald-300 overflow-x-auto mt-1">
                          {imp.suggestedFix}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Directory Tree View (When no specific file or browsing folder) */}
          {!selectedFile ? (
            <div className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
              {contentError ? (
                <div className="p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-rose-200">{contentError}</p>
                  {!auth.token && onOpenAuth && (
                    <button
                      onClick={onOpenAuth}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>{t.connectGithub}</span>
                    </button>
                  )}
                </div>
              ) : contents.length === 0 && !isLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No files or directories found in this path.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {contents.map((item) => (
                    <div
                      key={item.sha || item.path}
                      onClick={() => handleFileClick(item)}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/60 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.type === 'dir' ? (
                          <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={`truncate ${item.type === 'dir' ? 'font-semibold text-slate-200' : 'text-slate-300'}`}>
                          {item.name}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        {item.type === 'dir' ? 'Directory' : `${(item.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Selected File Content Viewer & Editor */
            <div className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
              {isEditingFile ? (
                <div className="p-4 space-y-4">
                  <textarea
                    value={editBuffer}
                    onChange={(e) => setEditBuffer(e.target.value)}
                    rows={20}
                    className="w-full bg-slate-950 font-mono text-xs text-slate-100 p-4 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />

                  {/* Commit message & AI generation */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">{t.commitMessage}</label>
                      <button
                        type="button"
                        onClick={handleAiCommitMsg}
                        disabled={isGeneratingCommitMsg}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isGeneratingCommitMsg ? t.generating : t.aiGenerateCommit}</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={commitMsgBuffer}
                      onChange={(e) => setCommitMsgBuffer(e.target.value)}
                      placeholder={`Update ${selectedFile.name}`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => setIsEditingFile(false)}
                        className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveFile}
                        disabled={isSavingFile}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
                      >
                        {isSavingFile ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{t.saveAndCommit}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Readonly viewer */
                <div className="p-4 overflow-x-auto max-h-[600px]">
                  <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
                    {fileRawContent}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* README Section at bottom of root folder */}
          {currentPath === '' && !selectedFile && readmeContent && (
            <div className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t.readme}</h3>
                </div>
              </div>
              <div className="p-6 prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed">
                <ReactMarkdown>{readmeContent}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: COMMITS */}
      {activeTab === 'commits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Commit History ({commits.length})</h3>
            <button
              onClick={loadCommits}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
            {commits.map((c) => (
              <div
                key={c.sha}
                onClick={() => handleViewCommitDetail(c)}
                className="p-4 hover:bg-slate-850 transition-colors flex items-start justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={c.author?.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
                    alt={c.commit.author.name}
                    className="w-7 h-7 rounded-full shrink-0 ring-1 ring-slate-700 mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100 truncate">{c.commit.message}</p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                      <span>{c.commit.author.name}</span>
                      <span>committed on</span>
                      <span>{new Date(c.commit.author.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] px-2 py-1 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                    {c.sha.substring(0, 7)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Single commit details modal/viewer */}
          {selectedCommit && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 mt-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-bold text-white">Commit Changes Diff</h4>
                <button onClick={() => setSelectedCommit(null)} className="text-slate-400 hover:text-white text-xs">
                  Close
                </button>
              </div>
              <div className="text-xs text-slate-300 font-semibold">{selectedCommit.commit?.message}</div>
              <div className="space-y-3">
                {selectedCommit.files?.map((f: any) => (
                  <div key={f.filename} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-indigo-300 font-medium">{f.filename}</span>
                      <span className="text-[10px] text-emerald-400">+{f.additions} -{f.deletions}</span>
                    </div>
                    {f.patch && (
                      <pre className="p-3 rounded bg-slate-950 text-[11px] font-mono overflow-x-auto text-slate-300">
                        {f.patch}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ISSUES */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setIssueStateFilter('open')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  issueStateFilter === 'open' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {t.openIssues}
              </button>
              <button
                onClick={() => setIssueStateFilter('closed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  issueStateFilter === 'closed' ? 'bg-slate-800 text-rose-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {t.closedIssues}
              </button>
            </div>

            {auth.token && (
              <button
                id="new-issue-btn"
                onClick={() => setIsCreatingIssue(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.newIssue}</span>
              </button>
            )}
          </div>

          {/* Issue creation form modal/card */}
          {isCreatingIssue && (
            <form onSubmit={handleCreateIssue} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">{t.newIssue}</h4>
                <button type="button" onClick={() => setIsCreatingIssue(false)} className="text-slate-400 text-xs">
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">{t.issueTitle}</label>
                <input
                  type="text"
                  required
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="Issue title..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">{t.issueDescription}</label>
                <textarea
                  rows={4}
                  value={newIssueBody}
                  onChange={(e) => setNewIssueBody(e.target.value)}
                  placeholder="Explain the problem or feature request..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {t.submitIssue}
                </button>
              </div>
            </form>
          )}

          {/* Issues List */}
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
            {issues.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">{t.noIssues}</div>
            ) : (
              issues.map((iss) => (
                <div
                  key={iss.id}
                  onClick={() => handleSelectIssue(iss)}
                  className="p-4 hover:bg-slate-850 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${iss.state === 'open' ? 'text-emerald-400' : 'text-purple-400'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-100">{iss.title}</span>
                        {iss.labels.map((lbl) => (
                          <span
                            key={lbl.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: `#${lbl.color}20`, color: `#${lbl.color}` }}
                          >
                            {lbl.name}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        #{iss.number} opened by {iss.user.login} on {new Date(iss.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{iss.comments}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Issue Thread Viewer */}
          {selectedIssue && (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 mt-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedIssue.title}</span>
                    <span className="text-slate-400">#{selectedIssue.number}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Status: <strong className={selectedIssue.state === 'open' ? 'text-emerald-400' : 'text-purple-400'}>{selectedIssue.state}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {auth.token && (
                    <button
                      onClick={() => handleToggleIssueState(selectedIssue)}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      {selectedIssue.state === 'open' ? t.closeIssue : t.reopenIssue}
                    </button>
                  )}
                  <button onClick={() => setSelectedIssue(null)} className="text-xs text-slate-400 hover:text-white">
                    Close
                  </button>
                </div>
              </div>

              {/* Issue Description */}
              {selectedIssue.body && (
                <div className="p-4 rounded-xl bg-slate-900 text-xs text-slate-300 leading-relaxed border border-slate-800">
                  <ReactMarkdown>{selectedIssue.body}</ReactMarkdown>
                </div>
              )}

              {/* Comments */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300">{t.comments} ({issueComments.length})</h4>
                {issueComments.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-200">{c.user.login}</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-300">
                      <ReactMarkdown>{c.body}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              {auth.token && (
                <div className="pt-2 space-y-3">
                  <textarea
                    rows={3}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddComment}
                      disabled={!newCommentText.trim()}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t.addComment}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: PULL REQUESTS */}
      {activeTab === 'pulls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{t.pullRequests} ({pulls.length})</h3>
            <button onClick={loadPulls} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
            {pulls.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">{t.noPulls}</div>
            ) : (
              pulls.map((pr) => (
                <div key={pr.id} className="p-4 hover:bg-slate-850 transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <GitPullRequest className={`w-4 h-4 shrink-0 mt-0.5 ${pr.merged_at ? 'text-purple-400' : pr.state === 'open' ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{pr.title}</div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        #{pr.number} by {pr.user.login} ({pr.head.ref} → {pr.base.ref})
                      </p>
                    </div>
                  </div>

                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: ACTIONS & CI/CD */}
      {activeTab === 'actions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">{t.workflows} & CI/CD</h3>
              <p className="text-xs text-slate-400">Manage GitHub Actions workflow runs and deployments</p>
            </div>
            <button onClick={loadWorkflows} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Workflows List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workflows.map((wf) => (
              <div key={wf.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{wf.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{wf.path}</p>
                </div>

                {auth.token && (
                  <button
                    onClick={() => handleDispatchWorkflow(wf)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{t.runWorkflow}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Workflow Runs List */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 mb-3">{t.workflowRuns}</h4>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
              {workflowRuns.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No workflow runs found.</div>
              ) : (
                workflowRuns.map((run) => (
                  <div key={run.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-850">
                    <div className="flex items-center gap-3 min-w-0">
                      {run.conclusion === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : run.conclusion === 'failure' ? (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate">{run.name} #{run.run_number}</div>
                        <div className="text-[10px] text-slate-400">Branch: {run.head_branch} • Event: {run.event}</div>
                      </div>
                    </div>

                    <a href={run.html_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI TOOLS */}
      {activeTab === 'ai-tools' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-800/50 space-y-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">{t.aiToolsTab} (Powered by Gemini)</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Supercharge your repository development with intelligent Gemini AI tools: generate complete production README files, review security and performance, and craft clean commit messages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tool 1: AI README Generator */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">{t.aiReadmeGenerator}</h4>
              </div>
              <p className="text-xs text-slate-400">
                Generate a comprehensive README.md with features, installation guides, stack overview and badges.
              </p>

              <button
                onClick={handleGenerateAiReadme}
                disabled={aiGeneratingReadme}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                {aiGeneratingReadme ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t.generate} README</span>
                  </>
                )}
              </button>
            </div>

            {/* Tool 2: Code Reviewer */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">{t.aiCodeReview}</h4>
              </div>
              <p className="text-xs text-slate-400">
                Analyze your repository files for security vulnerabilities, bugs, and performance optimization.
              </p>
              <button
                onClick={() => setActiveTab('code')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                <FileCode className="w-4 h-4" />
                <span>Select a File from Code Tab</span>
              </button>
            </div>
          </div>

          {/* Generated README preview & commit */}
          {aiGeneratedReadme && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400">Generated README Preview</h4>
                {auth.token && (
                  <button
                    onClick={async () => {
                      try {
                        await githubApi.createOrUpdateFile(
                          owner,
                          repoName,
                          'README.md',
                          aiGeneratedReadme,
                          'docs: add comprehensive README.md generated by AI',
                          undefined,
                          selectedBranch
                        );
                        showToast('README.md committed to repository!');
                        setReadmeContent(aiGeneratedReadme);
                      } catch (e: any) {
                        showToast('Failed to save README.');
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save to Repo</span>
                  </button>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 prose prose-invert max-w-none text-xs leading-relaxed max-h-96 overflow-y-auto">
                <ReactMarkdown>{aiGeneratedReadme}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SETTINGS & DANGER ZONE */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Repository Details</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div>Default Branch: <strong className="text-indigo-400">{repo.default_branch}</strong></div>
              <div>Language: <strong className="text-slate-100">{repo.language || 'N/A'}</strong></div>
              <div>Created: <strong className="text-slate-100">{new Date(repo.created_at).toLocaleDateString()}</strong></div>
              <div>Stars: <strong className="text-amber-400">{repo.stargazers_count}</strong></div>
            </div>
          </div>

          {auth.token && (
            <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-900/60 space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">{t.dangerZone}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t.deleteRepoConfirm} This will permanently delete the <strong>{repo.full_name}</strong> repository from GitHub.
              </p>

              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400">
                  {t.typeToConfirm} <strong className="text-rose-400 font-mono">{repo.name}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={repo.name}
                  className="w-full max-w-md bg-slate-950 border border-rose-900/60 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                id="delete-repo-confirm-btn"
                onClick={handleDeleteRepo}
                disabled={deleteConfirmName !== repo.name || isDeletingRepo}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-rose-600/20"
              >
                {isDeletingRepo ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{t.deleteRepo}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
