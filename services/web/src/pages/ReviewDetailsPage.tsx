import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  Clock,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Review, Finding, ReviewEvent } from '../types';
import { AgentPipeline } from '../components/AgentPipeline';
import { FindingCard } from '../components/FindingCard';

export const ReviewDetailsPage: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [showEventLog, setShowEventLog] = useState(false);

  const loadReviewData = async () => {
    if (!reviewId) return;
    try {
      const reviewData = await ApiService.getReview(reviewId);
      setReview(reviewData);

      const findingsData = await ApiService.getFindings(
        reviewId,
        selectedSeverity || undefined,
        selectedCategory || undefined
      );
      setFindings(findingsData);
    } catch (err: any) {
      console.error('Failed to load review details:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewData();
  }, [reviewId, selectedSeverity, selectedCategory]);

  // Subscribe to live SSE events if review is in active state
  useEffect(() => {
    if (!reviewId) return;

    const unsubscribe = ApiService.subscribeToReviewEvents(reviewId, (evt) => {
      setEvents((prev) => [...prev, evt]);

      // If status changed or completed, reload full review & findings
      if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(evt.status)) {
        loadReviewData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [reviewId]);

  const handleCancel = async () => {
    if (!reviewId) return;
    try {
      await ApiService.cancelReview(reviewId);
      loadReviewData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to cancel review');
    }
  };

  if (loading && !review) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-400 mb-3" />
        <p className="text-sm text-slate-400">Loading audit report...</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Review Not Found</h2>
        <p className="text-sm text-slate-300 mt-1">{error || 'Could not locate the requested review.'}</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const isRunning = review.status === 'queued' || review.status === 'running';
  const counts = review.severityCounts || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const totalFindings = counts.critical + counts.high + counts.medium + counts.low + counts.info;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/history"
            className="p-2 rounded-xl bg-card border border-border hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-white tracking-tight">{review.title}</h1>
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  review.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : review.status === 'running'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                    : review.status === 'failed'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-700/20 text-slate-400 border border-slate-700/30'
                }`}
              >
                {review.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                {review.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                <span>{review.status}</span>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 font-mono">
              <span>Language: <strong className="text-slate-200 uppercase">{review.language}</strong></span>
              <span>·</span>
              <span>Model: <strong className="text-slate-200">{review.model || 'mock-agent-v1'}</strong></span>
              {review.durationMs && (
                <>
                  <span>·</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{(review.durationMs / 1000).toFixed(2)}s</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isRunning && (
            <button
              onClick={handleCancel}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Review</span>
            </button>
          )}

          <a
            href={ApiService.getExportUrl(review.id, 'markdown')}
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </a>

          <a
            href={ApiService.getExportUrl(review.id, 'json')}
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </a>
        </div>
      </div>

      {/* Multi-Agent Swarm Orchestration Graph */}
      <AgentPipeline agentRuns={review.agentRuns || []} isReviewRunning={isRunning} />

      {/* Executive Summary Banner */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border-indigo-500/30 bg-gradient-to-r from-card to-indigo-950/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Consolidated Multi-Agent Summary</span>
            </div>
            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-4xl">
              {review.summary || (isRunning ? 'Multi-agent analysis in progress...' : 'Analysis completed.')}
            </p>
          </div>

          <button
            onClick={() => setShowEventLog(!showEventLog)}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Log ({events.length})</span>
          </button>
        </div>

        {/* Live SSE Event Stream Tray */}
        {showEventLog && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono max-h-48 overflow-y-auto space-y-1">
            <div className="text-[11px] text-slate-400 font-bold border-b border-slate-800 pb-1 mb-2">
              Server-Sent Events (SSE) Progress Feed
            </div>
            {events.length === 0 ? (
              <div className="text-slate-500">Awaiting stream events...</div>
            ) : (
              events.map((evt, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-indigo-400">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>
                  {evt.agentName && <span className="text-cyan-400">({evt.agentName})</span>}
                  <span className="text-slate-400">{evt.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Severity Filter Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          onClick={() => setSelectedSeverity(null)}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedSeverity === null
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-card border border-border text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>All Findings</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
            {totalFindings}
          </span>
        </button>

        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'critical' ? null : 'critical')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedSeverity === 'critical'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              : 'bg-card border border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
          }`}
        >
          <span>Critical</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-[10px] font-mono">
            {counts.critical}
          </span>
        </button>

        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'high' ? null : 'high')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedSeverity === 'high'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'bg-card border border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          <span>High</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono">
            {counts.high}
          </span>
        </button>

        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'medium' ? null : 'medium')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedSeverity === 'medium'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/30'
              : 'bg-card border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
          }`}
        >
          <span>Medium</span>
          <span className="px-1.5 py-0.2 rounded-full bg-yellow-500/20 text-[10px] font-mono">
            {counts.medium}
          </span>
        </button>

        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'low' ? null : 'low')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedSeverity === 'low'
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
              : 'bg-card border border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
          }`}
        >
          <span>Low</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-[10px] font-mono">
            {counts.low}
          </span>
        </button>

        <button
          onClick={() => setSelectedSeverity(selectedSeverity === 'info' ? null : 'info')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedSeverity === 'info'
              ? 'bg-slate-400 text-slate-950'
              : 'bg-card border border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <span>Info</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-500/20 text-[10px] font-mono">
            {counts.info}
          </span>
        </button>

        <div className="hidden sm:block h-6 w-px bg-slate-800 mx-2" />

        {['security', 'bugs', 'performance', 'quality', 'tests'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              selectedCategory === cat
                ? 'bg-indigo-950/60 border border-indigo-500 text-indigo-300'
                : 'bg-card border border-border text-slate-400 hover:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {findings.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Issues Found in this Category</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              All submitted source lines verified clean against the selected security and defect filters.
            </p>
          </div>
        ) : (
          findings.map((f) => <FindingCard key={f.id} finding={f} />)
        )}
      </div>
    </div>
  );
};
