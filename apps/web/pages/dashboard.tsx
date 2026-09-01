import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../src/lib/api';

type Project = {
  id: string;
  name: string;
  description?: string | null;
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    try {
      setError('');
      const res = await api.get('/projects');
      setProjects(res.data.items || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to load projects'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      setCreating(true);
      setError('');

      await api.post('/projects', {
        name: name.trim(),
        description: description.trim() || null,
      });

      setName('');
      setDescription('');

      await loadProjects();
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to create project'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-500">
          Manage your projects and tasks from one place.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Create Project
        </h2>

        <form
          onSubmit={createProject}
          className="mt-4 space-y-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full rounded-lg border p-3"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full rounded-lg border p-3"
          />

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Projects
        </h2>

        {loading && (
          <p className="text-gray-500">
            Loading projects...
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <h3 className="font-semibold text-gray-900">
              No projects yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your first project to get started.
            </p>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900">
                  {project.name}
                </h3>

                {project.description && (
                  <p className="mt-2 text-sm text-gray-500">
                    {project.description}
                  </p>
                )}

                <div className="mt-4 text-sm font-medium text-blue-600">
                  Open project ?
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
