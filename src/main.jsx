import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Polyfill the window.storage API (normally provided by the Claude.ai
// artifact sandbox) using plain localStorage so the app works standalone.
window.storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? { key, value, shared: false } : null;
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    } catch (e) {
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    } catch (e) {
      return null;
    }
  },
  async list(prefix = "") {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      return { keys, prefix, shared: false };
    } catch (e) {
      return null;
    }
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
