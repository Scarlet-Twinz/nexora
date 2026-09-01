import { useEffect } from 'react';
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
  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<SignupForm>();

  const router = useRouter();
  const { setAccess } = useAuth();

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

    if (invitedEmail) {
      setValue('email', invitedEmail);
    }
  }, [
    router.isReady,
    router.query.email,
    setValue,
  ]);

  const onSubmit = handleSubmit(async (data) => {
    const res = await api.post('/auth/signup', {
      ...data,
      ...(inviteToken
        ? { inviteToken }
        : {}),
    });

    setAccess(res.data.access);

    router.push('/dashboard');
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Create your Nexora account
        </h1>

        {inviteToken && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            You have been invited to join a Nexora workspace.
          </div>
        )}

        <input
          {...register('name')}
          type="text"
          placeholder="Name"
          className="mb-4 w-full rounded border p-3"
        />

        <input
          {...register('email')}
          type="email"
          placeholder="Email"
          className="mb-4 w-full rounded border p-3"
        />

        <input
          {...register('password')}
          type="password"
          placeholder="Password"
          className="mb-4 w-full rounded border p-3"
        />

        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-white"
        >
          Create account
        </button>
      </form>
    </div>
  );
}
