import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../src/lib/api';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
};

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const loadProject = async () => {
      try {
        const [projectRes, tasksRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/projects/${id}/tasks`),
        ]);

        setProject(projectRes.data);
        setTasks(tasksRes.data.items || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            'Failed to load project'
        );
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id]);

  const createTask = async () => {
    if (!id || typeof id !== 'string' || !title.trim()) return;

    try {
      setCreating(true);
      setError('');

      const res = await api.post(`/projects/${id}/tasks`, {
        title: title.trim(),
        description: description.trim() || undefined,
      });

      setTasks((current) => [...current, res.data]);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to create task'
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-500">
        Loading project...
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm font-medium text-blue-600"
        >
          ? Back to dashboard
        </button>

        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-gray-500">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ? Back to dashboard
      </button>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {project.name}
        </h1>

        {project.description && (
          <p className="mt-2 text-gray-500">
            {project.description}
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Create Task
        </h2>

        <div className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full rounded border p-3"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description (optional)"
            className="w-full rounded border p-3"
            rows={3}
          />

          <button
            onClick={createTask}
            disabled={creating || !title.trim()}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Tasks
        </h2>

        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <h3 className="font-semibold text-gray-900">
              No tasks yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your first task above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="mt-2 text-sm text-gray-500">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {task.status || 'TODO'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
