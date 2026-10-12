/* =========================================================
   SpendWise — profile page
   ========================================================= */
(function () {
  async function loadProfile() {
    try {
      const data = await SW.apiFetch("/auth/me/");
      const form = document.getElementById("profileForm");
      form.querySelector('[name="first_name"]').value = data.user.first_name || "";
      form.querySelector('[name="last_name"]').value = data.user.last_name || "";
      form.querySelector('[name="username"]').value = data.user.username || "";
      form.querySelector('[name="email"]').value = data.user.email || "";
      form.querySelector('[name="phone"]').value = data.profile.phone || "";
      form.querySelector('[name="currency"]').value = data.profile.currency || "NGN";
    } catch (err) {
      SW.toast("Could not load profile: " + err.message, "error");
    }
  }

  function initProfileForm() {
    const form = document.getElementById("profileForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      try {
        await SW.apiFetch("/profile/", {
          method: "PATCH",
          body: {
            phone: formData.get("phone"),
            currency: formData.get("currency"),
            user: {
              first_name: formData.get("first_name"),
              last_name: formData.get("last_name"),
              email: formData.get("email"),
            },
          },
        });
        SW.toast("Profile updated.", "success");
      } catch (err) {
        SW.toast(err.message, "error");
      }
    });
  }

  function initPasswordForm() {
    const form = document.getElementById("passwordForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      try {
        const data = await SW.apiFetch("/auth/change-password/", {
          method: "POST",
          body: {
            old_password: formData.get("old_password"),
            new_password: formData.get("new_password"),
          },
        });
        if (data.token) SW.setToken(data.token);
        SW.toast("Password updated.", "success");
        form.reset();
      } catch (err) {
        SW.toast(err.message, "error");
      }
    });
  }

  async function loadCategoryList() {
    const container = document.getElementById("categoryList");
    try {
      const data = await SW.apiFetch("/categories/", { params: { ordering: "name" } });
      const categories = data.results || data;
      if (categories.length === 0) {
        container.innerHTML = `<span class="sw-text-muted small">No categories yet.</span>`;
        return;
      }
      container.innerHTML = categories.map((c) => `
        <span class="sw-cat-pill">
          ${c.icon || "📁"} ${SW.escapeHtml(c.name)}
          <button class="btn-close btn-close-sm ms-1 delete-cat-btn" style="font-size:.55rem;" data-id="${c.id}"></button>
        </span>
      `).join("");
      container.querySelectorAll(".delete-cat-btn").forEach((btn) => {
        btn.addEventListener("click", () => deleteCategory(btn.dataset.id));
      });
    } catch (err) {
      SW.toast("Could not load categories: " + err.message, "error");
    }
  }

  async function deleteCategory(id) {
    if (!confirm("Delete this category? Transactions using it will become uncategorized.")) return;
    try {
      await SW.apiFetch(`/categories/${id}/`, { method: "DELETE" });
      SW.toast("Category deleted.", "success");
      loadCategoryList();
    } catch (err) {
      SW.toast(err.message, "error");
    }
  }

  function initCategoryForm() {
    const form = document.getElementById("categoryForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      try {
        await SW.apiFetch("/categories/", { method: "POST", body: { name: formData.get("name") } });
        SW.toast("Category added.", "success");
        form.reset();
        loadCategoryList();
      } catch (err) {
        SW.toast(err.message, "error");
      }
    });
  }

  document.addEventListener("sw:session-ready", () => {
    loadProfile();
    loadCategoryList();
    initProfileForm();
    initPasswordForm();
    initCategoryForm();
  });
})();
