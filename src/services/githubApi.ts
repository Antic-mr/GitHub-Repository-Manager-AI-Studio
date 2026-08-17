import {
  GitHubUser,
  GitHubRepo,
  GitHubBranch,
  GitHubCommit,
  GitHubContentItem,
  GitHubIssue,
  GitHubPullRequest,
  GitHubWorkflow,
  GitHubWorkflowRun
} from '../types';

export function decodeBase64Utf8(base64: string): string {
  try {
    const cleanBase64 = base64.replace(/[\r\n\s]/g, '');
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      return decodeURIComponent(escape(atob(base64.replace(/[\r\n\s]/g, ''))));
    } catch {
      return atob(base64.replace(/[\r\n\s]/g, ''));
    }
  }
}

export function encodeBase64Utf8(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

export class GitHubService {
  private token: string | null = null;

  constructor(token?: string | null) {
    this.token = token || null;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token.trim()}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {}),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      throw new Error(`Network error connecting to GitHub: ${networkErr.message}`);
    }

    if (!response.ok) {
      let errorMsg = `GitHub API Error (${response.status} ${response.statusText})`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMsg = errorData.message;
        }
      } catch {
        const text = await response.text().catch(() => '');
        if (text) {
          errorMsg = text;
        }
      }

      if (errorMsg.includes('gitmon refuses') || errorMsg.includes('rate limit') || response.status === 403) {
        throw new Error(
          this.token
            ? 'GitHub API rate limit or permission error. Please verify your token permissions.'
            : 'GitHub API rate limit reached for unauthenticated requests. Please connect with your GitHub Token.'
        );
      }

      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Get authenticated user
  async getAuthenticatedUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>('/user');
  }

  // Get public user info
  async getUser(username: string): Promise<GitHubUser> {
    return this.request<GitHubUser>(`/users/${encodeURIComponent(username)}`);
  }

  // Check Rate Limits
  async getRateLimit(): Promise<{ limit: number; remaining: number; reset: number }> {
    const data = await this.request<{ resources: { core: { limit: number; remaining: number; reset: number } } }>('/rate_limit');
    return data.resources.core;
  }

  // List user repositories
  async getUserRepos(params: {
    visibility?: 'all' | 'public' | 'private';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepo[]> {
    const query = new URLSearchParams({
      visibility: params.visibility || 'all',
      sort: params.sort || 'updated',
      direction: params.direction || 'desc',
      per_page: String(params.per_page || 100),
      page: String(params.page || 1),
    });

    if (this.token) {
      return this.request<GitHubRepo[]>(`/user/repos?${query.toString()}`);
    } else {
      // Fallback demo popular repos
      return this.request<GitHubRepo[]>(`/repositories?per_page=30`);
    }
  }

  // Search Repositories
  async searchRepos(query: string, sort = 'stars'): Promise<{ items: GitHubRepo[]; total_count: number }> {
    const q = encodeURIComponent(query);
    return this.request<{ items: GitHubRepo[]; total_count: number }>(`/search/repositories?q=${q}&sort=${sort}&order=desc&per_page=30`);
  }

  // Get single repository
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return this.request<GitHubRepo>(`/repos/${owner}/${repo}`);
  }

  // Create repository
  async createRepo(data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }): Promise<GitHubRepo> {
    return this.request<GitHubRepo>('/user/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // Delete repository
  async deleteRepo(owner: string, repo: string): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}`, {
      method: 'DELETE',
    });
  }

  // Star / Unstar
  async checkStarred(owner: string, repo: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.github.com/user/starred/${owner}/${repo}`, {
        headers: this.getHeaders(),
      });
      return res.status === 204;
    } catch {
      return false;
    }
  }

  async starRepo(owner: string, repo: string): Promise<void> {
    await this.request<void>(`/user/starred/${owner}/${repo}`, {
      method: 'PUT',
      headers: { 'Content-Length': '0' },
    });
  }

  async unstarRepo(owner: string, repo: string): Promise<void> {
    await this.request<void>(`/user/starred/${owner}/${repo}`, {
      method: 'DELETE',
    });
  }

  // Branches
  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    return this.request<GitHubBranch[]>(`/repos/${owner}/${repo}/branches?per_page=100`);
  }

  // Commits
  async getCommits(owner: string, repo: string, sha?: string): Promise<GitHubCommit[]> {
    const q = sha ? `?sha=${encodeURIComponent(sha)}&per_page=30` : '?per_page=30';
    return this.request<GitHubCommit[]>(`/repos/${owner}/${repo}/commits${q}`);
  }

  // Single Commit Details
  async getCommitDetail(owner: string, repo: string, ref: string): Promise<any> {
    return this.request<any>(`/repos/${owner}/${repo}/commits/${ref}`);
  }

  // Repository Contents (Files / Folders)
  async getContents(owner: string, repo: string, path: string = '', ref?: string): Promise<GitHubContentItem | GitHubContentItem[]> {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return this.request<GitHubContentItem | GitHubContentItem[]>(`/repos/${owner}/${repo}/contents/${cleanPath}${q}`);
  }

  // Get Safe File Content (decodes base64 or fetches through server proxy)
  async getFileContent(owner: string, repo: string, path: string = '', ref?: string): Promise<string> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    // Try direct API first
    try {
      const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
      const data = await this.request<any>(`/repos/${owner}/${repo}/contents/${cleanPath}${q}`);
      if (data && data.content && data.encoding === 'base64') {
        return decodeBase64Utf8(data.content);
      }
    } catch (apiErr: any) {
      console.warn('Direct API file fetch fallback to proxy:', apiErr.message);
    }

    // Fallback to server safe proxy
    try {
      const res = await fetch('/api/github/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          path: cleanPath,
          ref,
          token: this.token,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch file content');
      }

      const data = await res.json();
      if (data.content !== undefined) {
        return data.content;
      }
      throw new Error('No content returned for this file.');
    } catch (proxyErr: any) {
      throw proxyErr;
    }
  }

  // Get Safe README Content
  async getReadme(owner: string, repo: string, ref?: string): Promise<string | null> {
    // Try direct API first
    try {
      const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
      const data = await this.request<any>(`/repos/${owner}/${repo}/readme${q}`);
      if (data && data.content && data.encoding === 'base64') {
        return decodeBase64Utf8(data.content);
      }
    } catch {
      // ignore and try proxy
    }

    // Fallback to server safe proxy
    try {
      const res = await fetch('/api/github/readme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          ref,
          token: this.token,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.content || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Create or Update File (Commit to GitHub)
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<any> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const body: any = {
      message,
      content: encodeBase64Utf8(content), // Unicode safe base64
    };
    if (sha) body.sha = sha;
    if (branch) body.branch = branch;

    return this.request(`/repos/${owner}/${repo}/contents/${cleanPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // Delete File
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<any> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const body: any = { message, sha };
    if (branch) body.branch = branch;

    return this.request(`/repos/${owner}/${repo}/contents/${cleanPath}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // Issues
  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubIssue[]> {
    return this.request<GitHubIssue[]>(`/repos/${owner}/${repo}/issues?state=${state}&per_page=50`);
  }

  async createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels }),
    });
  }

  async updateIssueState(owner: string, repo: string, issueNumber: number, state: 'open' | 'closed'): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
  }

  async getIssueComments(owner: string, repo: string, issueNumber: number): Promise<any[]> {
    return this.request<any[]>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
  }

  async addIssueComment(owner: string, repo: string, issueNumber: number, body: string): Promise<any> {
    return this.request<any>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
  }

  // Pull Requests
  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubPullRequest[]> {
    return this.request<GitHubPullRequest[]>(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`);
  }

  async getPullRequestFiles(owner: string, repo: string, pullNumber: number): Promise<any[]> {
    return this.request<any[]>(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
  }

  // Workflows (GitHub Actions)
  async getWorkflows(owner: string, repo: string): Promise<{ workflows: GitHubWorkflow[]; total_count: number }> {
    return this.request<{ workflows: GitHubWorkflow[]; total_count: number }>(`/repos/${owner}/${repo}/actions/workflows`);
  }

  async getWorkflowRuns(owner: string, repo: string): Promise<{ workflow_runs: GitHubWorkflowRun[]; total_count: number }> {
    return this.request<{ workflow_runs: GitHubWorkflowRun[]; total_count: number }>(`/repos/${owner}/${repo}/actions/runs?per_page=20`);
  }

  async dispatchWorkflow(owner: string, repo: string, workflowId: number | string, ref: string): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
    });
  }
}

export const githubApi = new GitHubService();
