import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Search, Trash2, ArrowRight, FileCode2 } from 'lucide-react';
import { ApiService } from '../services/api';
import { Review } from '../types';

export const HistoryPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadReviews = () => {
    setLoading(true);
    ApiService.getReviews(1, 50, statusFilter || undefined)
      .then((res) => setReviews(res.reviews))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await ApiService.deleteReview(id);
      loadReviews();
    } catch (err: any) {
      alert('Failed to delete review');
    }
  };

  const filtered = reviews.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Audit History & Persistent Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reopen previous multi-agent reviews, inspect finding diffs, or export audit reports.
          </p>
        </div>

        <Link
          to="/new-review"
          className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>New Audit</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search reviews by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-indigo-500 capitalize"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Reviews Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading audit history...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No reviews matching the criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/40">
                  <th className="py-3.5 px-4">Review Title</th>
                  <th className="py-3.5 px-4">Language</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Findings Breakdown</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((r) => (
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
                              {r.severityCounts.critical} Crit
                            </span>
                          )}
                          {r.severityCounts.high > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              {r.severityCounts.high} High
                            </span>
                          )}
                          {r.severityCounts.medium > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                              {r.severityCounts.medium} Med
                            </span>
                          )}
                          {r.severityCounts.critical === 0 && r.severityCounts.high === 0 && r.severityCounts.medium === 0 && (
                            <span className="text-slate-500">None detected</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                      {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <Link
                          to={`/reviews/${r.id}`}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(r.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
