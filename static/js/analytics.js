/* =========================================================
   SpendWise — analytics page (Chart.js)
   ========================================================= */
(function () {
  let currency = "NGN";
  const palette = ["#0f9d74", "#0ea5a3", "#3b82f6", "#d9962b", "#e5484d", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];

  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  async function loadAnalytics() {
    try {
      const data = await SW.apiFetch("/analytics/", { params: { months: 6 } });
      renderTrendChart(data.monthly_trend);
      renderCategoryChart(data.spending_by_category);
      renderMonthlyExpenseChart(data.monthly_trend);
      renderSavingsProgress(data.savings_progress);
    } catch (err) {
      SW.toast("Could not load analytics: " + err.message, "error");
    }
  }

  function renderTrendChart(trend) {
    const ctx = document.getElementById("trendChart");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: trend.labels,
        datasets: [
          {
            label: "Income",
            data: trend.income,
            borderColor: "#0f9d74",
            backgroundColor: "rgba(15,157,116,.12)",
            tension: 0.35,
            fill: true,
            pointRadius: 3,
          },
          {
            label: "Expenses",
            data: trend.expenses,
            borderColor: "#e5484d",
            backgroundColor: "rgba(229,72,77,.1)",
            tension: 0.35,
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: {
          y: { ticks: { callback: (v) => SW.formatCurrency(v, currency) } },
        },
      },
    });
  }

  function renderCategoryChart(byCategory) {
    const ctx = document.getElementById("categoryChart");
    if (!byCategory || byCategory.length === 0) {
      ctx.parentElement.innerHTML = `<div class="sw-empty-state"><div class="sw-empty-icon">📊</div><p class="mb-0">No spending recorded this month yet.</p></div>`;
      return;
    }
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: byCategory.map((c) => `${c.icon} ${c.category}`),
        datasets: [{
          data: byCategory.map((c) => c.total),
          backgroundColor: palette,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
      },
    });
  }

  function renderMonthlyExpenseChart(trend) {
    const ctx = document.getElementById("monthlyExpenseChart");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: trend.labels,
        datasets: [{
          label: "Expenses",
          data: trend.expenses,
          backgroundColor: "#0ea5a3",
          borderRadius: 6,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => SW.formatCurrency(v, currency) } } },
      },
    });
  }

  function renderSavingsProgress(goals) {
    const container = document.getElementById("savingsProgressList");
    if (!goals || goals.length === 0) {
      container.innerHTML = `<div class="sw-empty-state py-3"><p class="mb-0 small">No savings goals yet.</p></div>`;
      return;
    }
    container.innerHTML = goals.map((g) => `
      <div class="mb-3">
        <div class="d-flex justify-content-between small mb-1">
          <span class="fw-semibold">${SW.escapeHtml(g.name)}</span>
          <span class="sw-text-muted">${g.percent}%</span>
        </div>
        <div class="sw-progress"><div style="width:${g.percent}%;"></div></div>
      </div>
    `).join("");
  }

  document.addEventListener("sw:session-ready", (e) => {
    currency = e.detail.profile?.currency || "NGN";
    loadAnalytics();
  });
})();
