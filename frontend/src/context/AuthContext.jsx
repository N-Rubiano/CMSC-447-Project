/**
 * src/context/AuthContext.jsx — Global authentication state.
 *
 * Provides:
 *   - `user`       : decoded JWT payload ({ id, email, role, full_name })
 *   - `token`      : raw JWT string
 *   - `login(token)` : store token, decode user, persist to localStorage
 *   - `logout()`    : clear state and redirect to /login
 *   - `can(capability)` : RBAC capability check matching backend CAPABILITY_MAP
 */

import { createContext, useContext, useState, useEffect } from "react";

// ── Capability map (mirrors backend permissions.py) ────────────────────────
const CAPABILITY_MAP = {
  "project.view":        ["admin","general_contractor","sub_contractor","architect","owner","field_inspector"],
  "project.create":      ["admin"],
  "project.update":      ["admin","general_contractor"],
  "team.manage":         ["admin","general_contractor"],
  "company.manage":      ["admin","general_contractor"],
  "sheet.view":          ["admin","general_contractor","sub_contractor","architect","owner","field_inspector"],
  "sheet.manage":        ["admin","general_contractor"],
  "pin.view":            ["admin","general_contractor","sub_contractor","architect","owner","field_inspector"],
  "pin.create":          ["admin","general_contractor","architect","field_inspector"],
  "pin.update":          ["admin","general_contractor","architect","field_inspector"],
  "pin.update.assigned": ["admin","general_contractor","sub_contractor","architect","field_inspector"],
  "pin.assign":          ["admin","general_contractor"],
  "pin.close":           ["admin"],
  "pin.delete":          ["admin"],
  "comment.create":      ["admin","general_contractor","sub_contractor","architect","owner","field_inspector"],
  "photo.create":        ["admin","general_contractor","sub_contractor","architect","field_inspector"],
  "report.export":       ["admin","general_contractor","architect","owner"],
  "task.manage":         ["admin","general_contractor"],
};

function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch { return null; }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [user,  setUser]  = useState(() => {
    const t = localStorage.getItem("access_token");
    return t ? decodeJwt(t) : null;
  });

  function login(newToken) {
    localStorage.setItem("access_token", newToken);
    setToken(newToken);
    setUser(decodeJwt(newToken));
  }

  function logout() {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }

  function can(capability) {
    if (!user?.role) return false;
    return (CAPABILITY_MAP[capability] ?? []).includes(user.role);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
