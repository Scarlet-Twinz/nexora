import { useState } from 'react';
import api from '../../src/lib/api';

export default function Billing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const priceId =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '';

  const upgrade = async () => {
    if (!priceId) {
      setError(
        'Stripe price is not configured. Set NEXT_PUBLIC_STRIPE_PRICE_PRO.'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await api.post(
        '/stripe/create-checkout-session',
        { priceId }
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Stripe checkout URL was not returned.');
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to start checkout'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Billing
        </h1>
        <p className="mt-2 text-gray-500">
          Manage your Nexora subscription.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Current plan
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Free
            </h2>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
            Active
          </span>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Nexora Pro
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Upgrade your workspace to unlock Pro features.
          </p>

          <button
            onClick={upgrade}
            disabled={loading}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Opening checkout...' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
