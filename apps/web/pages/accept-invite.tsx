import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../src/lib/api';

export default function AcceptInvite() {
  const router = useRouter();

  const [status, setStatus] = useState('Checking invitation...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const token =
      typeof router.query.token === 'string'
        ? router.query.token
        : '';

    if (!token) {
      setError('Invalid invitation link.');
      return;
    }

    const accept = async () => {
      try {
        const res = await api.post('/invites/accept', {
          token,
        });

        const action = res.data?.action;

        if (action === 'signup') {
          const email = res.data?.email || '';

          router.push({
            pathname: '/signup',
            query: {
              inviteToken: token,
              email,
            },
          });

          return;
        }

        if (action === 'already_member') {
          setStatus('You are already a member of this workspace.');
          return;
        }

        if (action === 'joined') {
          setStatus('Invitation accepted successfully.');
          return;
        }

        setStatus('Invitation processed.');
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            'This invitation is invalid or has expired.'
        );
      }
    };

    accept();
  }, [router.isReady, router.query.token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">
          Nexora Invitation
        </h1>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : (
          <p className="mt-4 text-gray-600">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
