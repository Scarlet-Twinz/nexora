import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import api from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';

type SignupForm = {
  name: string;
  email: string;
  password: string;
};

export default function Signup() {
  const { register, handleSubmit, setValue } = useForm<SignupForm>();
  const router = useRouter();
  const { setAccess } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inviteToken =
    typeof router.query.inviteToken === 'string'
      ? router.query.inviteToken
      : '';

  useEffect(() => {
    if (!router.isReady) return;

    const invitedEmail =
      typeof router.query.email === 'string'
        ? router.query.email
        : '';

    if (invitedEmail) setValue('email', invitedEmail);
  }, [router.isReady, router.query.email, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setSubmitting(true);
      setError('');

      const res = await api.post('/auth/signup', {
        ...data,
        ...(inviteToken ? { inviteToken } : {}),
      });

      if (!res.data?.access) {
        throw new Error('Account was created but authentication was not returned.');
      }

      setAccess(res.data.access);
      await router.push('/dashboard');
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to create your account. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Create your Nexora account</h1>
        <p className="mb-6 text-sm text-gray-500">Start your workspace and begin managing projects.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {inviteToken && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            You have been invited to join a Nexora workspace.
          </div>
        )}

        <input {...register('name', { required: true })} type="text" placeholder="Name" className="mb-4 w-full rounded border p-3" />
        <input {...register('email', { required: true })} type="email" placeholder="Email" className="mb-4 w-full rounded border p-3" />
        <input {...register('password', { required: true, minLength: 6 })} type="password" placeholder="Password" className="mb-4 w-full rounded border p-3" />

        <button type="submit" disabled={submitting} className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
          {submitting ? 'Creating account...' : 'Create account'}
        </button>

        <p className="mt-5 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
