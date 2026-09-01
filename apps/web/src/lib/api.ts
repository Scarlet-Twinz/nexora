import axios from 'axios';

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000',
  withCredentials: true,
});

let accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export default api;
