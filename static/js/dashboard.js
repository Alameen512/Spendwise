/* =========================================================
   SpendWise — dashboard page
   ========================================================= */
(function () {
  let currentPeriod = "month";
  let currency = "NGN";

  async function loadCategories() {
    try {
      const data = await SW.apiFetch("/categories/", { params: { ordering: "name" } });
      const categories = data.results || data;
      const select = document.getElementById("qaCategory");
      select.innerHTML = '<option value="">Uncategorized</option>' +
        categories.map((c) => `<option value="${c.id}">${c.icon || ""} ${SW.escapeHtml(c.name)}</option>`).join("");
    } catch (err) {
      SW.toast("Could not load categories: " + err.message, "error");
    }
  }

  async function loadDashboard(period) {
    document.getElementById("statBalance").innerHTML = skeleton();
    document.getElementById("statIncome").innerHTML = skeleton();
    document.getElementById("statExpenses").innerHTML = skeleton();
    document.getElementById("statSavings").innerHTML = skeleton();

    try {
      const data = await SW.apiFetch("/dashboard/", { params: { period } });
      document.getElementById("statBalance").textContent = SW.formatCurrency(data.balance, currency);
      document.getElementById("statIncome").textContent = SW.formatCurrency(data.income, currency);
      document.getElementById("statExpenses").textContent = SW.formatCurrency(data.expenses, currency);
      document.getElementById("statSavings").textContent = SW.formatCurrency(data.savings, currency);
      renderRecentTransactions(data.recent_transactions);
    } catch (err) {
      SW.toast("Could not load dashboard: " + err.message, "error");
    }
  }

  function skeleton() {
    return '<span class="sw-skeleton d-inline-block" style="width:90px;height:22px;"></span>';
  }

  function renderRecentTransactions(transactions) {
    const container = document.getElementById("recentTransactions");
    if (!transactions || transactions.length === 0) {
      container.innerHTML = `
        <div class="sw-empty-state py-4">
          <div class="sw-empty-icon">🧾</div>
          <p class="mb-0 small">No transactions yet. Add your first transaction to start tracking your finances.</p>
        </div>`;
      return;
    }

    container.innerHTML = transactions.map((t) => `
      <div class="d-flex align-items-center justify-content-between py-2" style="border-bottom: 1px solid var(--sw-border);">
        <div class="d-flex align-items-center gap-3">
          <div class="sw-cat-pill">${t.category_icon || "📁"} ${SW.escapeHtml(t.category_name || "Uncategorized")}</div>
          <div>
            <div class="fw-semibold small">${SW.escapeHtml(t.description)}</div>
            <div class="sw-text-muted" style="font-size:.75rem;">${SW.formatDate(t.date)}</div>
          </div>
        </div>
        <div class="fw-bold small ${t.transaction_type === "income" ? "text-success" : "text-danger"}">
          ${t.transaction_type === "income" ? "+" : "-"}${SW.formatCurrency(t.amount, currency)}
        </div>
      </div>
    `).join("");
  }

  function initPeriodFilter() {
    const buttons = document.querySelectorAll("#periodFilter [data-period]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentPeriod = btn.dataset.period;
        loadDashboard(currentPeriod);
      });
    });
  }

  function initQuickAdd() {
    const form = document.getElementById("quickAddForm");
    const dateInput = form.querySelector('[name="date"]');
    dateInput.value = SW.todayISO();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const payload = {
        transaction_type: formData.get("transaction_type"),
        description: formData.get("description"),
        amount: formData.get("amount"),
        date: formData.get("date"),
        category: formData.get("category") || null,
      };
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        await SW.apiFetch("/transactions/", { method: "POST", body: payload });
        SW.toast("Transaction added!", "success");
        form.reset();
        dateInput.value = SW.todayISO();
        loadDashboard(currentPeriod);
      } catch (err) {
        SW.toast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener("sw:session-ready", (e) => {
    currency = e.detail.profile?.currency || "NGN";
    loadCategories();
    loadDashboard(currentPeriod);
    initPeriodFilter();
    initQuickAdd();
  });
})();
