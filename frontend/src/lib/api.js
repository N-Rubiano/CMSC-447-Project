/**
 * src/lib/api.js — Axios HTTP client pre-configured for the PunchList Pro API.
 *
 * - Base URL: /api  (proxied to http://localhost:4000/api by Vite)
 * - Automatically attaches the JWT from localStorage as Authorization header
 * - On 401 responses, clears the stored token and redirects to /login
 */

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired / invalid tokens globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
