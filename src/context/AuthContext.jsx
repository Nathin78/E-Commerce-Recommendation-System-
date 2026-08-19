import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function isJwtExpired(token) {
  if (!token) return true;

  const parts = token.split(".");
  if (parts.length !== 3) return true;

  try {
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch (_error) {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("token") || "";
    if (!storedToken || isJwtExpired(storedToken)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return "";
    }
    return storedToken;
  });
  const [user, setUser] = useState(() => {
    const value = localStorage.getItem("user");
    return value ? safeJsonParse(value) : null;
  });

  const login = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const updateAuthUser = (nextUser, nextToken = token) => {
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
    if (nextToken) {
      setToken(nextToken);
      localStorage.setItem("token", nextToken);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value = useMemo(
    () => ({ token, user, login, logout, updateAuthUser, isAuthenticated: Boolean(token) }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
