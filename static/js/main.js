/* =========================================================
   SpendWise — core utilities shared by every page
   ========================================================= */
const SW = (() => {
  const API_BASE = window.SW_API_BASE || "/api";

  // ------------------------------------------------------
  // Token storage
  // ------------------------------------------------------
  function getToken() {
    return localStorage.getItem("sw_token");
  }
  function setToken(token) {
    localStorage.setItem("sw_token", token);
  }
  function clearToken() {
    localStorage.removeItem("sw_token");
    localStorage.removeItem("sw_user");
  }
  function setUser(user) {
    localStorage.setItem("sw_user", JSON.stringify(user));
  }
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("sw_user"));
    } catch (e) {
      return null;
    }
  }

  // ------------------------------------------------------
  // Fetch wrapper — talks to the DRF API
  // ------------------------------------------------------
  async function apiFetch(path, { method = "GET", body = null, params = null, auth = true } = {}) {
    let url = `${API_BASE}${path}`;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
      ).toString();
      if (qs) url += `?${qs}`;
    }

    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = getToken();
      if (token) headers["Authorization"] = `Token ${token}`;
    }

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });
    } catch (networkErr) {
      throw new Error("Network error — please check your connection and try again.");
    }

    if (response.status === 204) return null;

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
        const isPublicPage = location.pathname === "/" || location.pathname.startsWith("/login") || location.pathname.startsWith("/register");
        if (!isPublicPage) {
          window.location.href = "/login/";
        }
      }
      const message = extractErrorMessage(data) || `Request failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function extractErrorMessage(data) {
    if (!data) return null;
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    // DRF validation errors come back as {field: [messages]}
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      const msg = Array.isArray(val) ? val[0] : val;
      return `${firstKey === "non_field_errors" ? "" : firstKey + ": "}${msg}`;
    }
    return null;
  }

  // ------------------------------------------------------
  // Currency formatting (default: Nigerian Naira)
  // ------------------------------------------------------
  function formatCurrency(amount, currency = "NGN") {
    const num = Number(amount || 0);
    const symbols = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
    const symbol = symbols[currency] || "₦";
    const formatted = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol}${formatted}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ------------------------------------------------------
  // Toasts
  // ------------------------------------------------------
  function toast(message, type = "success", timeout = 4000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const icons = { success: "bi-check-circle-fill", error: "bi-exclamation-circle-fill", warning: "bi-exclamation-triangle-fill" };
    const el = document.createElement("div");
    el.className = `sw-toast ${type}`;
    el.innerHTML = `
      <i class="bi ${icons[type] || icons.success}" style="color: var(--sw-primary);"></i>
      <div class="flex-grow-1 small">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-sm"></button>
    `;
    el.querySelector(".btn-close").addEventListener("click", () => el.remove());
    container.appendChild(el);
    setTimeout(() => el.remove(), timeout);
  }

  // ------------------------------------------------------
  // Theme (light / dark)
  // ------------------------------------------------------
  function initTheme() {
    const saved = localStorage.getItem("sw_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);

    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("sw_theme", next);
        updateThemeIcon(next);
      });
    }
  }

  function updateThemeIcon(theme) {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    toggle.innerHTML = theme === "dark"
      ? '<i class="bi bi-sun-fill"></i>'
      : '<i class="bi bi-moon-stars-fill"></i>';
  }

  // ------------------------------------------------------
  // Sidebar (mobile)
  // ------------------------------------------------------
  function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("sidebarToggle");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar || !toggle) return;

    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("show");
      backdrop.classList.toggle("show");
    });
    if (backdrop) {
      backdrop.addEventListener("click", () => {
        sidebar.classList.remove("show");
        backdrop.classList.remove("show");
      });
    }
  }

  // ------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function todayISO() {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0, 10);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initSidebar();
  });

  return {
    apiFetch, getToken, setToken, clearToken, setUser, getUser,
    formatCurrency, formatDate, escapeHtml, toast, debounce, todayISO,
  };
})();
