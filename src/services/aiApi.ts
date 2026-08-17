export interface CommitSuggestion {
  title: string;
  body: string | null;
  persianSummary: string;
}

export interface CodeReviewResult {
  summary: string;
  score: number;
  strengths: string[];
  improvements: Array<{
    type: 'security' | 'performance' | 'readability' | 'bug';
    title: string;
    description: string;
    suggestedFix?: string;
  }>;
  persianSummary?: string;
}

export async function generateCommitMessage(diff: string, description: string, language: string = 'en'): Promise<CommitSuggestion> {
  const res = await fetch('/api/ai/commit-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diff, description, language }),
  });
  if (!res.ok) {
    throw new Error('Failed to generate AI commit message');
  }
  return res.json();
}

export async function generateReadme(repoName: string, description: string, stack: string, features: string, lang: 'fa' | 'en' = 'en'): Promise<string> {
  const res = await fetch('/api/ai/generate-readme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoName, description, stack, features, lang }),
  });
  if (!res.ok) {
    throw new Error('Failed to generate AI README');
  }
  const data = await res.json();
  return data.readme;
}

export async function reviewCode(filename: string, code: string, diff?: string): Promise<CodeReviewResult> {
  const res = await fetch('/api/ai/review-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, code, diff }),
  });
  if (!res.ok) {
    throw new Error('Failed to review code');
  }
  return res.json();
}

export async function askAiAssistant(message: string, repoContext?: any, history?: Array<{ role: 'user' | 'model'; text: string }>): Promise<string> {
  const res = await fetch('/api/ai/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, repoContext, history }),
  });
  if (!res.ok) {
    throw new Error('Failed to query AI Assistant');
  }
  const data = await res.json();
  return data.reply;
}
