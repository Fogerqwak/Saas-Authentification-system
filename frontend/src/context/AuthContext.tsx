import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

const API = "/api";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  twoFactorEnabled: boolean;
  roleNames?: string[];
  permissions?: string[];
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor?: boolean; token?: string }>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  verify2FA: (code: string, token?: string) => Promise<void>;
  setToken: (token: string) => void;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser({ ...data.user, ...data.user });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.requiresTwoFactor && data.token) {
        return { requiresTwoFactor: true, token: data.token };
      }
      setUser(data.user);
      return {};
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const verify2FA = useCallback(
    async (code: string, token?: string) => {
      const url = token
        ? `${API}/auth/2fa/login`
        : `${API}/auth/2fa/verify`;
      const body = token
        ? { token, code }
        : { code };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setUser(data.user);
    },
    []
  );

  const setToken = useCallback((token: string) => {
    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        verify2FA,
        setToken,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
