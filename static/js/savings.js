/* =========================================================
   SpendWise — savings goals page
   ========================================================= */
(function () {
  let currency = "NGN";
  let goalModal, fundsModal;

  async function loadGoals() {
    const grid = document.getElementById("goalsGrid");
    grid.innerHTML = `
      <div class="col-md-6 col-xl-4"><div class="sw-skeleton" style="height:190px;"></div></div>
      <div class="col-md-6 col-xl-4"><div class="sw-skeleton" style="height:190px;"></div></div>`;
    document.getElementById("goalsEmpty").classList.add("d-none");

    try {
      const data = await SW.apiFetch("/savings-goals/");
      renderGoals(data.results || data);
    } catch (err) {
      SW.toast("Could not load savings goals: " + err.message, "error");
      grid.innerHTML = "";
    }
  }

  function renderGoals(goals) {
    const grid = document.getElementById("goalsGrid");
    if (!goals || goals.length === 0) {
      grid.innerHTML = "";
      document.getElementById("goalsEmpty").classList.remove("d-none");
      return;
    }
    document.getElementById("goalsEmpty").classList.add("d-none");

    grid.innerHTML = goals.map((g) => `
      <div class="col-md-6 col-xl-4">
        <div class="sw-card p-4 h-100 sw-fade-in">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <div class="sw-feature-icon" style="width:40px;height:40px;font-size:1.1rem;">🎯</div>
            </div>
            <div class="dropdown">
              <button class="btn btn-sm sw-btn-outline" data-bs-toggle="dropdown"><i class="bi bi-three-dots"></i></button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><button class="dropdown-item edit-goal-btn" data-id="${g.id}">Edit</button></li>
                <li><button class="dropdown-item text-danger delete-goal-btn" data-id="${g.id}">Delete</button></li>
              </ul>
            </div>
          </div>
          <h6 class="fw-bold mb-1">${SW.escapeHtml(g.name)}</h6>
          <div class="sw-text-muted small mb-2">${SW.formatCurrency(g.current_amount, currency)} / ${SW.formatCurrency(g.target_amount, currency)}</div>
          <div class="sw-progress mb-2"><div style="width:${g.percent_complete}%;"></div></div>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold sw-gradient-text">${g.percent_complete}%</span>
            ${g.deadline ? `<span class="sw-text-muted" style="font-size:.72rem;">Due ${SW.formatDate(g.deadline)}</span>` : ""}
          </div>
          <button class="btn sw-btn-outline w-100 mt-3 add-funds-btn" data-id="${g.id}"><i class="bi bi-plus-lg"></i> Add Funds</button>
        </div>
      </div>
    `).join("");

    grid.querySelectorAll(".edit-goal-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(goals.find((g) => g.id == btn.dataset.id)));
    });
    grid.querySelectorAll(".delete-goal-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteGoal(btn.dataset.id));
    });
    grid.querySelectorAll(".add-funds-btn").forEach((btn) => {
      btn.addEventListener("click", () => openFundsModal(btn.dataset.id));
    });
  }

  function openEditModal(goal) {
    const form = document.getElementById("goalForm");
    form.reset();
    document.getElementById("goalModalTitle").textContent = "Edit Savings Goal";
    form.querySelector('[name="id"]').value = goal.id;
    form.querySelector('[name="name"]').value = goal.name;
    form.querySelector('[name="target_amount"]').value = goal.target_amount;
    form.querySelector('[name="current_amount"]').value = goal.current_amount;
    form.querySelector('[name="deadline"]').value = goal.deadline || "";
    goalModal.show();
  }

  function openFundsModal(id) {
    const form = document.getElementById("addFundsForm");
    form.reset();
    form.querySelector('[name="id"]').value = id;
    fundsModal.show();
  }

  async function deleteGoal(id) {
    if (!confirm("Delete this savings goal?")) return;
    try {
      await SW.apiFetch(`/savings-goals/${id}/`, { method: "DELETE" });
      SW.toast("Savings goal deleted.", "success");
      loadGoals();
    } catch (err) {
      SW.toast(err.message, "error");
    }
  }

  function initForms() {
    document.getElementById("goalModal").addEventListener("show.bs.modal", (e) => {
      if (e.relatedTarget) {
        const form = document.getElementById("goalForm");
        form.reset();
        document.getElementById("goalModalTitle").textContent = "New Savings Goal";
        form.querySelector('[name="id"]').value = "";
      }
    });

    const goalForm = document.getElementById("goalForm");
    goalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(goalForm);
      const id = formData.get("id");
      const payload = {
        name: formData.get("name"),
        target_amount: formData.get("target_amount"),
        current_amount: formData.get("current_amount") || 0,
        deadline: formData.get("deadline") || null,
      };
      try {
        if (id) {
          await SW.apiFetch(`/savings-goals/${id}/`, { method: "PATCH", body: payload });
          SW.toast("Goal updated.", "success");
        } else {
          await SW.apiFetch("/savings-goals/", { method: "POST", body: payload });
          SW.toast("Goal created.", "success");
        }
        goalModal.hide();
        loadGoals();
      } catch (err) {
        SW.toast(err.message, "error");
      }
    });

    const fundsForm = document.getElementById("addFundsForm");
    fundsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(fundsForm);
      const id = formData.get("id");
      try {
        const goal = await SW.apiFetch(`/savings-goals/${id}/`);
        const newAmount = Number(goal.current_amount) + Number(formData.get("amount"));
        await SW.apiFetch(`/savings-goals/${id}/`, { method: "PATCH", body: { current_amount: newAmount } });
        SW.toast("Funds added!", "success");
        fundsModal.hide();
        loadGoals();
      } catch (err) {
        SW.toast(err.message, "error");
      }
    });
  }

  document.addEventListener("sw:session-ready", (e) => {
    currency = e.detail.profile?.currency || "NGN";
    goalModal = new bootstrap.Modal(document.getElementById("goalModal"));
    fundsModal = new bootstrap.Modal(document.getElementById("addFundsModal"));
    loadGoals();
    initForms();
  });
})();
