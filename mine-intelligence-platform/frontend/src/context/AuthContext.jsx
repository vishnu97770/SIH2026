import { createContext, useContext, useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";

const AuthContext = createContext(null);

function nameFromEmail(email) {
  return email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      if (!getToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        const me = await api.authMe();
        setUser({ email: me.username, name: nameFromEmail(me.username) });
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    restore();

    const onExpired = () => setUser(null);
    window.addEventListener("mi-auth-expired", onExpired);
    return () => window.removeEventListener("mi-auth-expired", onExpired);
  }, []);

  const login = async (email, password) => {
    const { access_token: token } = await api.authLogin(email, password);
    setToken(token);
    setUser({ email, name: nameFromEmail(email) });
  };

  const register = async (email, password) => {
    const { access_token: token } = await api.authRegister(email, password);
    setToken(token);
    setUser({ email, name: nameFromEmail(email) });
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, authLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
