import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, AlertCircle, Wand2, Shield, Bug, Zap, Award, TestTube } from 'lucide-react';
import { ApiService } from '../services/api';

const SAMPLE_CODE = `import fs from 'fs';
import { Request, Response } from 'express';

// Vulnerable authentication and data handler sample
export async function handleUserLogin(req: any, res: Response) {
  const { username, password, fileParam } = req.body;
  const apiKey = "sk_live_9948281938abceef9"; // Hardcoded secret

  // SQL Injection risk via string concatenation
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  console.log("Executing user authentication query with token: " + req.headers.authorization);

  // Path traversal hazard
  const filePath = "/var/data/" + fileParam;
  const fileContent = fs.readFileSync(filePath, 'utf8'); // Synchronous blocking I/O

  // Loose equality and unhandled potential undefined
  if (req.query.role == 0) {
    req.session.data.isAdmin = true;
  }

  // Dangerous eval usage
  if (req.body.customCalculation) {
    const result = eval(req.body.customCalculation);
  }

  return res.json({ status: "success", content: fileContent });
}
`;

export const NewReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Authentication & File Handler Review');
  const [language, setLanguage] = useState('typescript');
  const [filePath, setFilePath] = useState('src/auth/handler.ts');
  const [code, setCode] = useState(SAMPLE_CODE);
  const [categories, setCategories] = useState<string[]>([
    'bugs',
    'security',
    'performance',
    'quality',
    'tests',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat));
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleLoadSample = () => {
    setCode(SAMPLE_CODE);
    setTitle('Vulnerable Express Handler Audit');
    setFilePath('src/auth/handler.ts');
    setLanguage('typescript');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Source code cannot be empty.');
      return;
    }
    if (!filePath.trim()) {
      setError('File path cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await ApiService.createReview({
        title,
        language,
        categories,
        files: [{ path: filePath.trim(), content: code }],
      });

      navigate(`/reviews/${res.id}`);
    } catch (err: any) {
      console.error('Failed to create review:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to submit review';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { id: 'security', label: 'Security & CWE', icon: Shield, color: 'text-rose-400' },
    { id: 'bugs', label: 'Logic Bugs', icon: Bug, color: 'text-amber-400' },
    { id: 'performance', label: 'Performance', icon: Zap, color: 'text-purple-400' },
    { id: 'quality', label: 'Code Quality', icon: Award, color: 'text-blue-400' },
    { id: 'tests', label: 'Test Coverage', icon: TestTube, color: 'text-emerald-400' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span>Submit Code for Multi-Agent Review</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Untrusted code is parsed in memory without host execution. Line citations and evidence are verified.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center space-x-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-[1.02] w-fit"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Load Vulnerable Sample Code</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div>
            <strong className="font-semibold">Review Error:</strong> {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Review Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Authentication & Payment Service Audit"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-border text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-border text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors capitalize"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="java">Java</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Analysis Categories to Run Concurrently
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {categoryOptions.map((opt) => {
                const isSelected = categories.includes(opt.id);
                const Icon = opt.icon;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggleCategory(opt.id)}
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-sm'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${opt.color}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Relative Source File Path
              </label>
              <span className="text-[11px] text-slate-400 font-mono">No directory traversal (..) permitted</span>
            </div>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              required
              placeholder="e.g. src/auth/handler.ts"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-border text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Source Code Content
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {code.split('\n').length} lines · {new Blob([code]).size} bytes
              </span>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-border bg-slate-950">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={16}
                required
                placeholder="Paste your source code here..."
                className="w-full p-4 bg-transparent text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-600/40"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Launching Swarm...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Multi-Agent Analysis</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
