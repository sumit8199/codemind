import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, Check, Copy, FileText, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Finding, Severity } from '../types';

interface FindingCardProps {
  finding: Finding;
}

const severityConfig: Record<Severity, { bg: string; text: string; border: string; icon: any }> = {
  critical: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: ShieldAlert,
  },
  high: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
  },
  medium: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    icon: AlertTriangle,
  },
  low: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: Info,
  },
  info: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    icon: Info,
  },
};

export const FindingCard: React.FC<FindingCardProps> = ({ finding }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const config = severityConfig[finding.severity] || severityConfig.info;
  const Icon = config.icon;

  const copyPatch = () => {
    if (finding.suggestedPatch) {
      navigator.clipboard.writeText(finding.suggestedPatch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all ${config.border} bg-card/60 backdrop-blur-sm hover:border-indigo-500/40 glow-card mb-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{finding.severity}</span>
          </span>

          <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono border border-slate-700">
            {finding.category}
          </span>

          {finding.cwe && (
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-rose-950/40 text-rose-300 font-mono border border-rose-800/40">
              {finding.cwe}
            </span>
          )}

          <span className="text-xs text-slate-400">
            Agent: <strong className="text-slate-300">{finding.agent}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <div className="flex items-center space-x-1">
            <span>Confidence:</span>
            <span className="font-mono text-slate-200 font-semibold">{(finding.confidence * 100).toFixed(0)}%</span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <h4 className="text-base font-bold text-slate-100">{finding.title}</h4>
      </div>

      {finding.filePath && (
        <div className="flex items-center space-x-2 text-xs text-indigo-400 font-mono mt-1.5 mb-3 bg-indigo-950/20 px-2.5 py-1 rounded-md w-fit border border-indigo-900/30">
          <FileText className="w-3.5 h-3.5" />
          <span>{finding.filePath}</span>
          {finding.startLine && (
            <span className="text-slate-400">:L{finding.startLine}{finding.endLine && finding.endLine !== finding.startLine ? `-L${finding.endLine}` : ''}</span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 text-sm">
          {finding.description && (
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{finding.description}</p>
            </div>
          )}

          {finding.impact && (
            <div>
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block mb-1">Impact Analysis</span>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{finding.impact}</p>
            </div>
          )}

          {finding.recommendation && (
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">Remediation Advice</span>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{finding.recommendation}</p>
            </div>
          )}

          {finding.codeSnippet && (
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/80">
              <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Vulnerable Code Line</span>
                {finding.startLine && <span>Line {finding.startLine}</span>}
              </div>
              <pre className="p-3 text-xs font-mono text-rose-300 overflow-x-auto">
                <code>{finding.codeSnippet}</code>
              </pre>
            </div>
          )}

          {finding.evidence && (
            <div className="text-xs text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 font-mono">
              <strong className="text-slate-300">Verified Evidence:</strong> {finding.evidence}
            </div>
          )}

          {finding.suggestedPatch && (
            <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-950/10">
              <div className="px-3 py-1.5 bg-emerald-950/30 border-b border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Suggested Remediation Patch</span>
                </span>
                <button
                  onClick={copyPatch}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors text-[11px]"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Patch'}</span>
                </button>
              </div>
              <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                <code>{finding.suggestedPatch}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
