import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import api from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';

type LoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const { register, handleSubmit } = useForm<LoginForm>();
  const router = useRouter();
  const { setAccess } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/auth/login', data);

      if (!res.data?.access) {
        throw new Error('Login succeeded without an access token.');
      }

      setAccess(res.data.access);
      await router.push('/dashboard');
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to log in. Please check your details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-2 text-2xl font-bold">Login to Nexora</h1>
        <p className="mb-6 text-sm text-gray-500">Sign in to your workspace.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <input {...register('email', { required: true })} type="email" placeholder="Email" className="mb-4 w-full rounded border p-3" />
        <input {...register('password', { required: true })} type="password" placeholder="Password" className="mb-4 w-full rounded border p-3" />

        <button type="submit" disabled={submitting} className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
          {submitting ? 'Logging in...' : 'Login'}
        </button>

        <p className="mt-5 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold text-blue-600 hover:underline">Create one</Link>
        </p>
      </form>
    </div>
  );
}
