import React from 'react';
import { Shield, Sparkles, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                CodeMind AI
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0 Multi-Agent
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Automated Security & Architecture Review Platform</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-lg text-slate-300">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Multi-Agent Swarm: <strong className="text-emerald-400 font-medium">Ready</strong></span>
        </div>

        <Link
          to="/new-review"
          className="flex items-center space-x-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Start Review</span>
        </Link>
      </div>
    </header>
  );
};
