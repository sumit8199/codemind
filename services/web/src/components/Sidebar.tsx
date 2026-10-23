import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileCode2, History, FolderKanban, ShieldAlert, Cpu } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/new-review', label: 'New Review', icon: FileCode2 },
    { to: '/history', label: 'Review History', icon: History },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card/40 backdrop-blur-sm p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
            Navigation
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-border/60">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
            Active Agent Swarm
          </span>
          <div className="mt-3 px-3 space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="flex items-center space-x-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Context Agent</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">Active</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="flex items-center space-x-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Security Agent</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">Active</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="flex items-center space-x-2">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Bug Agent</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">Active</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="flex items-center space-x-2">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Performance Agent</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">Active</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center space-x-2">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Quality & Tests</span>
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">CodeMind AI Engine</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Untrusted code analyzed without execution. Findings backed by verifiable line citations.
        </p>
      </div>
    </aside>
  );
};
