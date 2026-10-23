import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, FileCode2, CheckCircle2, ArrowRight, Sparkles, Activity } from 'lucide-react';
import { ApiService } from '../services/api';
import { Review } from '../types';

export const DashboardPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiService.getReviews(1, 10)
      .then((res) => {
        setReviews(res.reviews);
      })
      .catch((err) => console.error('Failed to load reviews:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalReviews = reviews.length;
  const criticalCount = reviews.reduce((sum, r) => sum + (r.severityCounts?.critical || 0), 0);
  const completedCount = reviews.filter((r) => r.status === 'completed').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-8 border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-card to-cyan-950/20 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Multi-Agent Static & Security Review Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Elevate Code Quality with Verifiable, Multi-Agent Intelligence
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            CodeMind AI orchestrates 6 specialized AI analysis agents concurrently. We analyze logic bugs, security CVEs, performance leaks, and test gaps without ever executing untrusted source code on host.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to="/new-review"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
            >
              <FileCode2 className="w-4 h-4" />
              <span>Submit Code for Review</span>
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
            >
              <span>View Review History</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Audits</span>
            <FileCode2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{totalReviews}</span>
            <span className="text-xs text-slate-400">reviews</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Durable database records</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-400">{completedCount}</span>
            <span className="text-xs text-slate-400">successful</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Full consensus achieved</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Flaws</span>
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-400">{criticalCount}</span>
            <span className="text-xs text-slate-400">detected</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Verified with CWE citations</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl glow-card">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Agent Swarm</span>
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-cyan-400">6 + 1</span>
            <span className="text-xs text-slate-400">agents</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Parallel AST & LLM workers</div>
        </div>
      </div>

      {/* Recent Reviews Table */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Recent Code Reviews</span>
          </h2>
          <Link to="/history" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1">
            <span>See all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileCode2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-sm">No code reviews yet.</p>
            <p className="text-xs text-slate-500 mt-1">Start by submitting your first snippet or file.</p>
            <Link
              to="/new-review"
              className="mt-4 inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
            >
              Start First Review
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Review Title</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Findings</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <Link to={`/reviews/${r.id}`} className="hover:text-indigo-400 transition-colors">
                        {r.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400 uppercase">
                      {r.language}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          r.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'running'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                            : r.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-700/20 text-slate-400 border border-slate-700/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      {r.severityCounts ? (
                        <div className="flex items-center space-x-1.5">
                          {r.severityCounts.critical > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                              {r.severityCounts.critical}C
                            </span>
                          )}
                          {r.severityCounts.high > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              {r.severityCounts.high}H
                            </span>
                          )}
                          {r.severityCounts.medium > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                              {r.severityCounts.medium}M
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/reviews/${r.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
