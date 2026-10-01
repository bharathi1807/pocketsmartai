/**
 * PocketSmart AI - Recommendations Presentation Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("recommendationsContainer");
  const emptyState = document.getElementById("recEmptyState");

  // Read stored recommendation
  const rawData = localStorage.getItem(window.APP_CONFIG.LAST_REC_STORAGE_KEY);
  if (!rawData) {
    if (container) container.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  let data;
  try {
    data = JSON.parse(rawData);
  } catch {
    if (container) container.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  renderResults(data);
});

function renderResults(data) {
  const summaryEl = document.getElementById("budgetSummaryRow");
  const progressFill = document.getElementById("budgetProgressFill");
  const cardsList = document.getElementById("recommendationsList");
  const tipsList = document.getElementById("tipsList");
  const badgeFallback = document.getElementById("fallbackBadge");
  const disclaimerEl = document.getElementById("disclaimerNotice");

  const bs = data.budget_summary || {
    total_budget: data.budget || 0,
    allocated: data.budget || 0,
    remaining: 0,
    allocation_percentage: 100,
  };

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div>
        <span class="stat-label">Total Budget</span>
        <div class="stat-value tabular-nums">${ApiService.formatCurrency(bs.total_budget)}</div>
      </div>
      <div>
        <span class="stat-label">Allocated</span>
        <div class="stat-value tabular-nums" style="color: var(--accent-secondary);">
          ${ApiService.formatCurrency(bs.allocated)}
        </div>
      </div>
      <div>
        <span class="stat-label">Remaining Surplus</span>
        <div class="stat-value tabular-nums" style="color: ${bs.remaining < 0 ? 'var(--accent-danger)' : 'var(--text-muted)'};">
          ${ApiService.formatCurrency(bs.remaining)}
        </div>
      </div>
    `;
  }

  if (progressFill) {
    const pct = Math.min(100, Math.max(0, bs.allocation_percentage || 0));
    progressFill.style.width = `${pct}%`;
  }

  if (badgeFallback) {
    badgeFallback.style.display = data.is_fallback ? "inline-block" : "none";
  }

  if (disclaimerEl) {
    disclaimerEl.textContent = data.disclaimer || "AI-generated recommendation. Prices are market estimates.";
  }

  // Render Item Cards
  if (cardsList) {
    const items = data.recommendations || [];
    cardsList.innerHTML = items
      .map((item) => {
        const query = encodeURIComponent(item.external_search_query || item.name);
        const searchLink = `https://www.google.com/search?q=${query}`;

        return `
          <div class="rec-card">
            <div class="rec-card-top">
              <span class="rec-category">${item.category}</span>
              <span class="rec-price tabular-nums">${ApiService.formatCurrency(item.estimated_price)}</span>
            </div>
            <h3 class="rec-name">${item.name}</h3>
            <p class="rec-desc">${item.description}</p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
              <strong style="color: var(--text-secondary);">Why it fits:</strong> ${item.reason}
            </p>
            <div class="rec-footer">
              <span class="rec-platform">Suggested Platform: <strong>${item.platform}</strong></span>
              <a href="${searchLink}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                Search Marketplace ↗
              </a>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Render Actionable Tips
  if (tipsList) {
    const tips = data.tips || [];
    tipsList.innerHTML = tips.map((t) => `<li>${t}</li>`).join("");
  }
}
