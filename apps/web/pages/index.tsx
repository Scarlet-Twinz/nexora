import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-48px)] bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Nexora</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Projects, teams, and work in one place.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            Manage projects and collaborate with your team from a single workspace.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
              Create an account
            </Link>
            <Link href="/login" className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 hover:bg-gray-50">
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            ['Projects', 'Create and organize your work in dedicated project spaces.'],
            ['Teams', 'Keep workspace members connected to the projects they need.'],
            ['Workspace', 'Move from authentication into one place for managing your work.'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
