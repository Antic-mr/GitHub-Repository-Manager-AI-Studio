import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Safe GitHub Content/File Proxy to prevent gitmon scraping blocks
app.post('/api/github/file', async (req, res) => {
  try {
    const { owner, repo, path: filePath, ref, token } = req.body;
    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo are required' });
    }

    const cleanPath = (filePath || '').startsWith('/') ? filePath.slice(1) : (filePath || '');
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}${q}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'GitHub-Manager-AI-Studio/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `GitHub API returned status ${response.status}`,
        details: errorText
      });
    }

    const data: any = await response.json();
    if (data.content && data.encoding === 'base64') {
      const buffer = Buffer.from(data.content.replace(/\s/g, ''), 'base64');
      const text = buffer.toString('utf-8');
      return res.json({ content: text, item: data });
    } else if (data.download_url) {
      const rawRes = await fetch(data.download_url, { headers });
      const rawText = await rawRes.text();
      return res.json({ content: rawText, item: data });
    }

    res.json({ item: data });
  } catch (error: any) {
    console.error('Error fetching file content:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch file content' });
  }
});

// Safe GitHub README Proxy
app.post('/api/github/readme', async (req, res) => {
  try {
    const { owner, repo, ref, token } = req.body;
    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo are required' });
    }

    const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const url = `https://api.github.com/repos/${owner}/${repo}/readme${q}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'GitHub-Manager-AI-Studio/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Readme not found' });
    }

    const data: any = await response.json();
    if (data.content && data.encoding === 'base64') {
      const buffer = Buffer.from(data.content.replace(/\s/g, ''), 'base64');
      const text = buffer.toString('utf-8');
      return res.json({ content: text, item: data });
    }

    res.json({ content: '', item: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch README' });
  }
});

// GitHub OAuth Authorization URL Generator
app.get('/api/auth/github-url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/auth/callback`;

  if (!clientId) {
    return res.status(400).json({
      error: 'GITHUB_CLIENT_ID is not configured in environment variables. You can still use a Personal Access Token (PAT).'
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo,workflow,user,read:org',
    allow_signup: 'true',
    state: Math.random().toString(36).substring(7),
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl, redirectUri });
});

// OAuth Callback Route (popup receiver)
const callbackHandler = async (req: express.Request, res: express.Response) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>GitHub Auth Failed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>Authentication Failed</h2>
          <p style="color: red;">${error_description || error}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_ERROR', error: '${error_description || error}' }, '*');
              setTimeout(() => window.close(), 2500);
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing on server.');
    }

    // Exchange code for access token with GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'GitHub-Manager-AI-Studio',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'GitHub-Manager-AI-Studio',
      },
    });

    const userData = await userResponse.json();

    // Return HTML snippet communicating token to parent window
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0d1117; color: #c9d1d9; }
            .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; text-align: center; max-width: 400px; }
            .spinner { border: 3px solid #30363d; border-top: 3px solid #238636; border-radius: 50%; width: 32px; height: 32px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="color: #2ea043; margin-top: 0;">Connected to GitHub</h3>
            <p>Welcome, <strong>${userData.login || 'Developer'}</strong>! Closing authentication window...</p>
            <div class="spinner"></div>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GITHUB_AUTH_SUCCESS',
                  token: '${accessToken}',
                  user: ${JSON.stringify(userData)}
                }, '*');
                setTimeout(() => window.close(), 600);
              } else {
                window.location.href = '/';
              }
            } catch (err) {
              console.error('Error posting message:', err);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0d1117; color: #ff7b72;">
          <h3>OAuth Exchange Failed</h3>
          <p>${err.message || 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
};

app.get('/auth/callback', callbackHandler);
app.get('/auth/callback/', callbackHandler);

// AI: Generate Conventional Commit Message
app.post('/api/ai/commit-message', async (req, res) => {
  try {
    const { diff, description, language } = req.body;
    const ai = getAIClient();

    const prompt = `You are a world-class Git commit engineer.
Generate a concise, professional Git commit message following the Conventional Commits specification (e.g. "feat: add user authentication", "fix(api): resolve timeout in repo fetch", "refactor: optimize file tree rendering").
Context:
Description of change: ${description || 'N/A'}
Language/Context: ${language || 'General'}
Diff or code changes:
\`\`\`
${(diff || '').substring(0, 3000)}
\`\`\`

Return ONLY a JSON object with this exact structure:
{
  "title": "<type>(<optional scope>): <imperative summary under 72 chars>",
  "body": "<optional bulleted details if significant, or null>",
  "persianSummary": "<خلاصه فارسی کامیت در یک جمله روان>"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('Error in commit-message AI:', error);
    res.status(500).json({ error: error.message || 'Failed to generate commit message' });
  }
});

// AI: Generate README or Project Scaffold
app.post('/api/ai/generate-readme', async (req, res) => {
  try {
    const { repoName, description, stack, features, lang } = req.body;
    const ai = getAIClient();

    const prompt = `Create an exceptional, production-grade GitHub README.md markdown file for a repository named "${repoName}".
Project details:
Description: ${description || 'A modern software project'}
Tech Stack: ${stack || 'TypeScript, React, Tailwind'}
Key Features: ${features || 'High performance, modular architecture, easy configuration'}
Language: ${lang === 'fa' ? 'Persian (fa) with English technical terms where appropriate' : 'English'}

The README must contain:
1. Beautiful Title and clean badges
2. Project Overview
3. Key Features list with emojis
4. Tech Stack overview
5. Getting Started (Prerequisites, Installation, Running, Testing)
6. Project Structure diagram or summary
7. Contributing and License guidelines

Output only clean markdown content.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    res.json({ readme: response.text });
  } catch (error: any) {
    console.error('Error in generate-readme AI:', error);
    res.status(500).json({ error: error.message || 'Failed to generate README' });
  }
});

// AI: Code Review & Suggestions
app.post('/api/ai/review-code', async (req, res) => {
  try {
    const { filename, code, diff } = req.body;
    const ai = getAIClient();

    const prompt = `You are a senior principal software engineer conducting a thorough code review.
File: ${filename || 'Code Snippet'}
Code Content or Diff:
\`\`\`
${(code || diff || '').substring(0, 4000)}
\`\`\`

Provide a constructive, actionable review formatted as JSON:
{
  "summary": "Overall evaluation in 2 sentences",
  "score": 85, // number from 1-100
  "strengths": ["string", "string"],
  "improvements": [
    {
      "type": "security | performance | readability | bug",
      "title": "Short title",
      "description": "Clear explanation",
      "suggestedFix": "Code snippet or exact replacement if applicable"
    }
  ],
  "persianSummary": "خلاصه بازبینی به فارسی"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error in review-code AI:', error);
    res.status(500).json({ error: error.message || 'Failed to review code' });
  }
});

// AI: GitHub Assistant / Copilot Chat
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { message, repoContext, history } = req.body;
    const ai = getAIClient();

    const systemInstruction = `You are the GitHub Manager AI Assistant (دستیار هوشمند مدیریت گیت‌هاب).
You specialize in GitHub workflows, Git commands, repository architecture, GitHub Actions CI/CD pipelines, issue resolution, and code debugging.
Current Repository Context: ${repoContext ? JSON.stringify(repoContext) : 'No specific repository selected yet.'}
Respond fluently in Persian (فارسی) if the user asks in Persian, or English if asked in English.
Provide clear code snippets, GitHub CLI commands, or YAML workflow templates when relevant.`;

    const chatContents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        chatContents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      }
    }
    chatContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: chatContents,
      config: {
        systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Error in AI Assistant:', error);
    res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

// Vite Middleware & Static Serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GitHub Manager Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
