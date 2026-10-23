import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Loader2, Cpu, ShieldAlert, Zap, Award, TestTube, Binary } from 'lucide-react';
import { AgentRun } from '../types';

interface AgentPipelineProps {
  agentRuns: AgentRun[];
  isReviewRunning: boolean;
}

export const AgentPipeline: React.FC<AgentPipelineProps> = ({ agentRuns, isReviewRunning }) => {
  const agentDefinitions = [
    { name: 'context_agent', label: 'Context', icon: Cpu, color: 'text-cyan-400' },
    { name: 'security_agent', label: 'Security', icon: ShieldAlert, color: 'text-rose-400' },
    { name: 'bug_agent', label: 'Bugs', icon: AlertCircle, color: 'text-amber-400' },
    { name: 'performance_agent', label: 'Performance', icon: Zap, color: 'text-purple-400' },
    { name: 'quality_agent', label: 'Quality', icon: Award, color: 'text-blue-400' },
    { name: 'test_agent', label: 'Tests', icon: TestTube, color: 'text-emerald-400' },
    { name: 'static_analyzer', label: 'Deterministic Tool', icon: Binary, color: 'text-indigo-400' },
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
          <span>Multi-Agent Swarm Orchestration Graph</span>
          {isReviewRunning && (
            <span className="flex items-center space-x-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analyzing concurrent workflows</span>
            </span>
          )}
        </h3>
        <span className="text-xs text-slate-400">Isolated Execution Sandbox</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {agentDefinitions.map((def) => {
          const run = agentRuns.find((r) => r.agent_name === def.name);
          const Icon = def.icon;
          const status = run ? run.status : isReviewRunning ? 'running' : 'idle';

          return (
            <div
              key={def.name}
              className={`p-3.5 rounded-xl border transition-all ${
                status === 'running'
                  ? 'bg-indigo-950/30 border-indigo-500/40 shadow-md shadow-indigo-500/10 animate-agent-pulse'
                  : status === 'completed'
                  ? 'bg-slate-900/60 border-slate-700/60'
                  : status === 'failed'
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : 'bg-slate-900/30 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${def.color}`} />
                {status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {status === 'running' && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                {status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                {status === 'idle' && <Clock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className="text-xs font-semibold text-slate-200 truncate">{def.label}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 capitalize">
                <span>{status}</span>
                {run?.duration_ms ? <span>{run.duration_ms}ms</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
