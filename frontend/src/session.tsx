import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api, { setAuthToken } from "./api";
import type { User } from "./types";

type SessionContextValue = {
  ready: boolean;
  token: string | null;
  user: User | null;
  setSession: (nextToken: string, nextUser: User) => void;
  clearSession: () => void;
  refreshUser: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "certicampus-session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      setReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { token: string; user: User };
      setToken(parsed.token);
      setUser(parsed.user);
      setAuthToken(parsed.token);
    } catch (error) {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  const setSession = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: nextToken, user: nextUser }),
    );
  };

  const clearSession = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const refreshUser = async () => {
    if (!token) {
      return;
    }

    const response = await api.get<{ user: User }>("/auth/me");
    setUser(response.data.user);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, user: response.data.user }),
    );
  };

  const value = useMemo(
    () => ({
      ready,
      token,
      user,
      setSession,
      clearSession,
      refreshUser,
    }),
    [ready, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
