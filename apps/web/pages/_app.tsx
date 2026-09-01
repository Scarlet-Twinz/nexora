import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { AuthProvider } from '../src/context/AuthContext';
import Layout from '../components/Layout';

export default function App({
  Component,
  pageProps,
}: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
