import React, { useEffect, useState } from 'react';
import { FolderKanban, Plus, Trash2, FolderPlus } from 'lucide-react';
import { ApiService } from '../services/api';
import { Project } from '../types';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = () => {
    setLoading(true);
    ApiService.getProjects()
      .then((data) => setProjects(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      await ApiService.createProject(name.trim(), description.trim());
      setName('');
      setDescription('');
      setShowModal(false);
      loadProjects();
    } catch (err: any) {
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await ApiService.deleteProject(id);
      loadProjects();
    } catch (err: any) {
      alert('Failed to delete project');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            <span>Codebase Projects</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Group audits by repository, microservice, or product domain.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center">
          <FolderPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Projects Created</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Organize code reviews into projects to track defect resolution over time.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <div key={p.id} className="glass-panel p-5 rounded-2xl glow-card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-100 text-sm">{p.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  {p.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/40 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                <span className="text-indigo-400 font-mono text-[10px]">Tracked</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-indigo-500/30 bg-card shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create New Project</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Payments Microservice"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-border text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional context about repository scope..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-border text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
