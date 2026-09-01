import Link from 'next/link';
import { ReactNode } from 'react';
import { useAuth } from '../src/context/AuthContext';

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  const { access, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r px-5 py-6">
        <Link
          href="/"
          className="text-2xl font-bold text-blue-600"
        >
          Nexora
        </Link>

        <nav className="mt-8 space-y-2">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 hover:bg-gray-100"
          >
            Dashboard
          </Link>

          {access && (
            <>
              <Link
                href="/settings/billing"
                className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                Billing
              </Link>

              <Link
                href="/settings/members"
                className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                Members
              </Link>

              <button
                onClick={logout}
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
