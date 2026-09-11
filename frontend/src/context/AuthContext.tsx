import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from '../api/client';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

type AuthResponse = { token: string; user: User };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: User }>('/auth/me', { auth: true })
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function register(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const res = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: input,
    });
    setToken(res.token);
    setUser(res.user);
  }

  async function login(input: { email: string; password: string }) {
    const res = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: input,
    });
    setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
