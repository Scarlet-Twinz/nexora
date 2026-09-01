import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

import { setApiAccessToken } from '../lib/api';

type AuthContextType = {
  access: string | null;
  setAccess: (token: string) => void;
  logout: () => void;
};

export const AuthContext =
  createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [access, setAccessState] =
    useState<string | null>(null);

  const setAccess = (token: string) => {
    setAccessState(token);
    setApiAccessToken(token);
  };

  const logout = () => {
    setAccessState(null);
    setApiAccessToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        access,
        setAccess,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}
