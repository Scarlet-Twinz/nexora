import { useState } from 'react';
import api from '../../src/lib/api';

export default function Members() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const invite = async () => {
    if (!email.trim()) return;

    try {
      setLoading(true);
      setMessage('');
      setError('');

      const res = await api.post('/invites', {
        email: email.trim(),
        role,
      });

      setMessage(
        `Invitation created for ${res.data.email}.`
      );

      setEmail('');
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to send invitation'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Members
        </h1>
        <p className="mt-2 text-gray-500">
          Invite people to collaborate in your Nexora workspace.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Invite a member
        </h2>

        <div className="mt-5 space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="member@example.com"
            className="w-full rounded-lg border p-3"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border p-3"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>

          <button
            onClick={invite}
            disabled={loading || !email.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-4 text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
