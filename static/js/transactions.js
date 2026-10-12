/* =========================================================
   SpendWise — transactions page
   ========================================================= */
(function () {
  let categories = [];
  let currency = "NGN";
  let sortField = "date";
  let sortDir = "desc";
  let modalInstance;

  async function loadCategories() {
    try {
      const data = await SW.apiFetch("/categories/", { params: { ordering: "name" } });
      categories = data.results || data;

      const catFilter = document.getElementById("categoryFilter");
      catFilter.innerHTML = '<option value="">All Categories</option>' +
        categories.map((c) => `<option value="${c.id}">${c.icon || ""} ${SW.escapeHtml(c.name)}</option>`).join("");

      const modalSelect = document.getElementById("modalCategorySelect");
      modalSelect.innerHTML = '<option value="">Uncategorized</option>' +
        categories.map((c) => `<option value="${c.id}">${c.icon || ""} ${SW.escapeHtml(c.name)}</option>`).join("");
    } catch (err) {
      SW.toast("Could not load categories: " + err.message, "error");
    }
  }

  function currentFilters() {
    const ordering = (sortDir === "desc" ? "-" : "") + sortField;
    return {
      q: document.getElementById("searchInput").value.trim(),
      type: document.getElementById("typeFilter").value,
      category: document.getElementById("categoryFilter").value,
      date_from: document.getElementById("dateFromFilter").value,
      date_to: document.getElementById("dateToFilter").value,
      ordering,
    };
  }

  async function loadTransactions() {
    const tbody = document.getElementById("transactionsBody");
    tbody.innerHTML = `<tr><td colspan="6"><div class="sw-skeleton" style="height:40px;"></div></td></tr>`;
    document.getElementById("transactionsEmpty").classList.add("d-none");

    try {
      const data = await SW.apiFetch("/transactions/", { params: currentFilters() });
      const transactions = data.results || data;
      renderTable(transactions);
    } catch (err) {
      SW.toast("Could not load transactions: " + err.message, "error");
      tbody.innerHTML = "";
    }
  }

  function renderTable(transactions) {
    const tbody = document.getElementById("transactionsBody");
    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = "";
      document.getElementById("transactionsEmpty").classList.remove("d-none");
      return;
    }
    document.getElementById("transactionsEmpty").classList.add("d-none");

    tbody.innerHTML = transactions.map((t) => `
      <tr>
        <td class="sw-text-muted small">${SW.formatDate(t.date)}</td>
        <td>
          <div class="fw-semibold">${SW.escapeHtml(t.description)}</div>
          ${t.notes ? `<div class="sw-text-muted" style="font-size:.75rem;">${SW.escapeHtml(t.notes)}</div>` : ""}
        </td>
        <td><span class="sw-cat-pill">${t.category_icon || "📁"} ${SW.escapeHtml(t.category_name || "Uncategorized")}</span></td>
        <td class="fw-bold ${t.transaction_type === "income" ? "text-success" : "text-danger"}">
          ${t.transaction_type === "income" ? "+" : "-"}${SW.formatCurrency(t.amount, currency)}
        </td>
        <td><span class="sw-badge ${t.transaction_type === "income" ? "sw-badge-income" : "sw-badge-expense"}">${t.transaction_type}</span></td>
        <td class="text-end">
          <button class="btn btn-sm sw-btn-outline me-1 edit-btn" data-id="${t.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm sw-btn-outline text-danger delete-btn" data-id="${t.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(transactions.find((t) => t.id == btn.dataset.id)));
    });
    tbody.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
    });
  }

  function openEditModal(transaction) {
    const form = document.getElementById("transactionForm");
    form.reset();
    document.getElementById("transactionModalTitle").textContent = "Edit Transaction";
    form.querySelector('[name="id"]').value = transaction.id;
    form.querySelector('[name="description"]').value = transaction.description;
    form.querySelector('[name="amount"]').value = transaction.amount;
    form.querySelector('[name="date"]').value = transaction.date;
    form.querySelector('[name="notes"]').value = transaction.notes || "";
    form.querySelector('[name="category"]').value = transaction.category || "";
    form.querySelector(`#tt${transaction.transaction_type === "income" ? "Income" : "Expense"}`).checked = true;
    modalInstance.show();
  }

  function openNewModal() {
    const form = document.getElementById("transactionForm");
    form.reset();
    document.getElementById("transactionModalTitle").textContent = "New Transaction";
    form.querySelector('[name="id"]').value = "";
    form.querySelector('[name="date"]').value = SW.todayISO();
    document.getElementById("ttExpense").checked = true;
  }

  async function deleteTransaction(id) {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    try {
      await SW.apiFetch(`/transactions/${id}/`, { method: "DELETE" });
      SW.toast("Transaction deleted.", "success");
      loadTransactions();
    } catch (err) {
      SW.toast(err.message, "error");
    }
  }

  function initForm() {
    document.getElementById("newTransactionBtn").addEventListener("click", openNewModal);

    const form = document.getElementById("transactionForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const id = formData.get("id");
      const payload = {
        transaction_type: formData.get("transaction_type"),
        description: formData.get("description"),
        amount: formData.get("amount"),
        date: formData.get("date"),
        notes: formData.get("notes"),
        category: formData.get("category") || null,
      };
      try {
        if (id) {
          await SW.apiFetch(`/transactions/${id}/`, { method: "PATCH", body: payload });
          SW.toast("Transaction updated.", "success");
        } else {
          await SW.apiFetch("/transactions/", { method: "POST", body: payload });
          SW.toast("Transaction added.", "success");
        }
        modalInstance.hide();
        loadTransactions();
      } catch (err) {
        SW.toast(err.message, "error");
      }
    });
  }

  function initFiltersAndSort() {
    document.getElementById("searchInput").addEventListener("input", SW.debounce(loadTransactions, 350));
    document.getElementById("typeFilter").addEventListener("change", loadTransactions);
    document.getElementById("categoryFilter").addEventListener("change", loadTransactions);
    document.getElementById("dateFromFilter").addEventListener("change", loadTransactions);
    document.getElementById("dateToFilter").addEventListener("change", loadTransactions);

    document.querySelectorAll("[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortField = field;
          sortDir = "desc";
        }
        loadTransactions();
      });
    });
  }

  document.addEventListener("sw:session-ready", (e) => {
    currency = e.detail.profile?.currency || "NGN";
    modalInstance = new bootstrap.Modal(document.getElementById("transactionModal"));
    loadCategories();
    loadTransactions();
    initForm();
    initFiltersAndSort();
  });
})();
