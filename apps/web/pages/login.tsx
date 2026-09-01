import { useForm } from 'react-hook-form';
import api from '../src/lib/api';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';

type LoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const { register, handleSubmit } = useForm<LoginForm>();
  const router = useRouter();
  const { setAccess } = useAuth();

  const onSubmit = handleSubmit(async (data) => {
    const res = await api.post('/auth/login', data);

    setAccess(res.data.access);

    router.push('/dashboard');
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-2xl font-bold">
          Login to Nexora
        </h1>

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
          Login
        </button>
      </form>
    </div>
  );
}
