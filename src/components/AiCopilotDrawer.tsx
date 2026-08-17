import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Code2, 
  Terminal, 
  RefreshCw,
  GitBranch,
  Lightbulb
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askAiAssistant } from '../services/aiApi';
import { GitHubRepo } from '../types';
import { Language, translations } from '../translations';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRepo: GitHubRepo | null;
  lang: Language;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  selectedRepo,
  lang,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: lang === 'fa' 
        ? 'سلام! من دستیار هوشمند مدیریت گیت‌هاب هستم. می‌توانید درباره کدهای پروژه، ساخت ورک‌فلوهای GitHub Actions، کامیت‌ها و حل باگ‌ها از من بپرسید.'
        : 'Hello! I am your GitHub AI Copilot. Ask me anything about repository architecture, CI/CD workflows, Git commands, commit messages, or debugging.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = lang === 'fa' ? [
    'یک ورک‌فلو GitHub Actions برای Build و Test بنویس',
    'چگونه شاخه اصلی را با یک pull request ادغام کنم؟',
    'یک ساختار استاندارد برای README بنویس',
    'تفاوت git rebase و git merge چیست؟',
  ] : [
    'Generate a GitHub Actions CI workflow for this repo',
    'How do I create and merge a PR with GitHub CLI?',
    'Explain the Conventional Commits specification',
    'Best practices for repo branch protection rules',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const newHistory: Message[] = [...messages, { role: 'user', text }];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const repoContext = selectedRepo ? {
        name: selectedRepo.name,
        fullName: selectedRepo.full_name,
        language: selectedRepo.language,
        description: selectedRepo.description,
        defaultBranch: selectedRepo.default_branch,
      } : null;

      const reply = await askAiAssistant(text, repoContext, newHistory);
      setMessages([...newHistory, { role: 'model', text: reply }]);
    } catch (err: any) {
      setMessages([
        ...newHistory,
        { role: 'model', text: 'Error contacting AI Copilot. Please make sure the Gemini API key is configured.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>GitHub AI Copilot</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">Gemini 3.7</span>
            </h3>
            {selectedRepo && (
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">{selectedRepo.name}</p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/30 overflow-x-auto flex gap-2 no-scrollbar">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 hover:bg-indigo-900/40 hover:border-indigo-600 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3 text-indigo-400" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 text-xs leading-relaxed ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'model' && (
              <div className="w-7 h-7 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-3.5 rounded-2xl max-w-[85%] relative group ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-sm'
              }`}
            >
              <div className="prose prose-invert max-w-none text-xs">
                <ReactMarkdown>{m.text}</ReactMarkdown>
              </div>

              {m.role === 'model' && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(m.text);
                    setCopiedIndex(idx);
                    setTimeout(() => setCopiedIndex(null), 2000);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-900 text-slate-400 hover:text-white transition-opacity"
                  title="Copy text"
                >
                  {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 text-xs">
            <div className="w-7 h-7 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              <span>AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === 'fa' ? 'سوالی بپرسید یا درخواستی بنویسید...' : 'Ask a question or request code...'}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
