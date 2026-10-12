/* =========================================================
   SpendWise — authentication handling
   ========================================================= */
(function () {
  const PROTECTED_PATHS = ["/dashboard/", "/transactions/", "/budgets/", "/savings/", "/analytics/", "/profile/"];

  function isProtectedPage() {
    return PROTECTED_PATHS.some((p) => location.pathname.startsWith(p));
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    const text = btn.querySelector(".btn-text");
    const spinner = btn.querySelector(".sw-spinner");
    if (spinner) spinner.classList.toggle("d-none", !loading);
    if (text) text.style.opacity = loading ? "0.6" : "1";
  }

  function showAlert(message) {
    const alertBox = document.getElementById("formAlert");
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");
  }
  function hideAlert() {
    const alertBox = document.getElementById("formAlert");
    if (alertBox) alertBox.classList.add("d-none");
  }

  // ------------------------------------------------------
  // Login form
  // ------------------------------------------------------
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const btn = document.getElementById("loginSubmitBtn");
      setButtonLoading(btn, true);

      const formData = new FormData(loginForm);
      try {
        const data = await SW.apiFetch("/auth/login/", {
          method: "POST",
          auth: false,
          body: { username: formData.get("username"), password: formData.get("password") },
        });
        SW.setToken(data.token);
        SW.setUser(data.user);
        window.location.href = "/dashboard/";
      } catch (err) {
        showAlert(err.message || "Unable to login. Please check your credentials.");
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }

  // ------------------------------------------------------
  // Register form
  // ------------------------------------------------------
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const btn = document.getElementById("registerSubmitBtn");

      const formData = new FormData(registerForm);
      const password = formData.get("password");
      const password2 = formData.get("password2");
      if (password !== password2) {
        showAlert("Passwords do not match.");
        return;
      }

      setButtonLoading(btn, true);
      try {
        const data = await SW.apiFetch("/auth/register/", {
          method: "POST",
          auth: false,
          body: {
            username: formData.get("username"),
            email: formData.get("email"),
            first_name: formData.get("first_name"),
            last_name: formData.get("last_name"),
            password,
            password2,
          },
        });
        SW.setToken(data.token);
        SW.setUser(data.user);
        window.location.href = "/dashboard/";
      } catch (err) {
        showAlert(err.message || "Unable to create your account.");
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }

  // ------------------------------------------------------
  // Logout
  // ------------------------------------------------------
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await SW.apiFetch("/auth/logout/", { method: "POST" });
      } catch (e) {
        // ignore — clear locally regardless
      }
      SW.clearToken();
      window.location.href = "/login/";
    });
  }

  // ------------------------------------------------------
  // Guard protected pages + populate avatar/greeting
  // ------------------------------------------------------
  async function initSession() {
    if (!isProtectedPage()) return;

    if (!SW.getToken()) {
      window.location.href = "/login/";
      return;
    }

    try {
      const data = await SW.apiFetch("/auth/me/");
      SW.setUser(data.user);
      window.SW_PROFILE = data.profile;

      const initials = ((data.user.first_name?.[0] || data.user.username[0]) + (data.user.last_name?.[0] || "")).toUpperCase();
      const avatar = document.getElementById("userAvatar");
      if (avatar) avatar.textContent = initials;

      const greeting = document.getElementById("greeting");
      if (greeting) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        const name = data.user.first_name || data.user.username;
        greeting.textContent = `${timeGreeting}, ${SW.escapeHtml(name)} 👋`;
      }

      document.dispatchEvent(new CustomEvent("sw:session-ready", { detail: data }));
    } catch (err) {
      // apiFetch already redirects on 401
    }
  }

  document.addEventListener("DOMContentLoaded", initSession);
})();
