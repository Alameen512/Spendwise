/* =========================================================
   SpendWise — budgets page
   ========================================================= */
(function () {
  let categories = [];
  let currency = "NGN";
  let modalInstance;

  async function loadCategories() {
    const data = await SW.apiFetch("/categories/", { params: { ordering: "name" } });
    categories = data.results || data;
    const select = document.getElementById("budgetCategorySelect");
    select.innerHTML = categories.map((c) => `<option value="${c.id}">${c.icon || ""} ${SW.escapeHtml(c.name)}</option>`).join("");
  }

  async function loadBudgets() {
    const grid = document.getElementById("budgetsGrid");
    grid.innerHTML = `
      <div class="col-md-6 col-xl-4"><div class="sw-skeleton" style="height:170px;"></div></div>
      <div class="col-md-6 col-xl-4"><div class="sw-skeleton" style="height:170px;"></div></div>`;
    document.getElementById("budgetsEmpty").classList.add("d-none");

    try {
      const data = await SW.apiFetch("/budgets/");
      const budgets = data.results || data;
      renderBudgets(budgets);
    } catch (err) {
      SW.toast("Could not load budgets: " + err.message, "error");
      grid.innerHTML = "";
    }
  }

  function renderBudgets(budgets) {
    const grid = document.getElementById("budgetsGrid");
    if (!budgets || budgets.length === 0) {
      grid.innerHTML = "";
      document.getElementById("budgetsEmpty").classList.remove("d-none");
      return;
    }
    document.getElementById("budgetsEmpty").classList.add("d-none");

    grid.innerHTML = budgets.map((b) => {
      const pct = b.percent_used;
      const barClass = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
      return `
      <div class="col-md-6 col-xl-4">
        <div class="sw-card p-4 h-100 sw-fade-in">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="sw-cat-pill mb-1">${b.category_icon || "📁"} ${SW.escapeHtml(b.category_name)}</div>
            </div>
            <div class="dropdown">
              <button class="btn btn-sm sw-btn-outline" data-bs-toggle="dropdown"><i class="bi bi-three-dots"></i></button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><button class="dropdown-item edit-budget-btn" data-id="${b.id}">Edit</button></li>
                <li><button class="dropdown-item text-danger delete-budget-btn" data-id="${b.id}">Delete</button></li>
              </ul>
            </div>
          </div>
          <div class="sw-text-muted small mb-1">Budget: ${SW.formatCurrency(b.amount, currency)}</div>
          <div class="sw-progress ${barClass} mb-2"><div style="width:${pct}%;"></div></div>
          <div class="d-flex justify-content-between small">
            <span class="sw-text-muted">Spent: <strong style="color:var(--sw-text)">${SW.formatCurrency(b.spent, currency)}</strong></span>
            <span class="${pct >= 100 ? "text-danger" : "sw-text-muted"} fw-semibold">${SW.formatCurrency(b.remaining, currency)} left</span>
          </div>
          <div class="sw-text-muted mt-2" style="font-size:.72rem;">${SW.formatDate(b.start_date)} — ${SW.formatDate(b.end_date)}</div>
        </div>
      </div>`;
    }).join("");

    grid.querySelectorAll(".edit-budget-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(budgets.find((b) => b.id == btn.dataset.id)));
    });
    grid.querySelectorAll(".delete-budget-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteBudget(btn.dataset.id));
    });
  }

  function openEditModal(budget) {
    const form = document.getElementById("budgetForm");
    form.reset();
    document.getElementById("budgetModalTitle").textContent = "Edit Budget";
    form.querySelector('[name="id"]').value = budget.id;
    form.querySelector('[name="category"]').value = budget.category;
    form.querySelector('[name="amount"]').value = budget.amount;
    form.querySelector('[name="start_date"]').value = budget.start_date;
    form.querySelector('[name="end_date"]').value = budget.end_date;
    modalInstance.show();
  }

  async function deleteBudget(id) {
    if (!confirm("Delete this budget?")) return;
    try {
      await SW.apiFetch(`/budgets/${id}/`, { method: "DELETE" });
      SW.toast("Budget deleted.", "success");
      loadBudgets();
    } catch (err) {
      SW.toast(err.message, "error");
    }
  }

  function initForm() {
    document.getElementById("budgetModal").addEventListener("show.bs.modal", (e) => {
      if (e.relatedTarget) {
        const form = document.getElementById("budgetForm");
        form.reset();
        document.getElementById("budgetModalTitle").textContent = "New Budget";
        form.querySelector('[name="id"]').value = "";
        const today = SW.todayISO();
        form.querySelector('[name="start_date"]').value = today;
      }
    });

    const form = document.getElementById("budgetForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const id = formData.get("id");
      const payload = {
        category: formData.get("category"),
        amount: formData.get("amount"),
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date"),
      };
      try {
        if (id) {
          await SW.apiFetch(`/budgets/${id}/`, { method: "PATCH", body: payload });
          SW.toast("Budget updated.", "success");
        } else {
          await SW.apiFetch("/budgets/", { method: "POST", body: payload });
          SW.toast("Budget created.", "success");
        }
        modalInstance.hide();
        loadBudgets();
      } catch (err) {
        SW.toast(err.message, "error");
      }
    });
  }

  document.addEventListener("sw:session-ready", async (e) => {
    currency = e.detail.profile?.currency || "NGN";
    modalInstance = new bootstrap.Modal(document.getElementById("budgetModal"));
    await loadCategories();
    loadBudgets();
    initForm();
  });
})();
