/**
 * PocketSmart AI - Dashboard Page Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Check session (guests are welcome)
  const user = ApiService.getUser();

  // Populate user name
  const userNameEl = document.getElementById("dashboardUserName");
  if (userNameEl) {
    userNameEl.textContent = user ? user.name : "Guest Planner";
  }

  // Load History & Metrics
  const recentTableBody = document.getElementById("recentTableBody");
  const statTotalPlans = document.getElementById("statTotalPlans");
  const statTotalBudget = document.getElementById("statTotalBudget");
  const statAvgBudget = document.getElementById("statAvgBudget");

  try {
    const historyData = await ApiService.getHistory();
    const items = (historyData && historyData.items) || [];

    // Calculate metrics
    let totalBudgetSum = 0;
    items.forEach((item) => {
      const budget = item.response_data?.budget || item.request_data?.total_budget || item.request_data?.budget || 0;
      totalBudgetSum += Number(budget) || 0;
    });

    if (statTotalPlans) statTotalPlans.textContent = items.length;
    if (statTotalBudget) statTotalBudget.textContent = ApiService.formatCurrency(totalBudgetSum);
    if (statAvgBudget) {
      const avg = items.length > 0 ? totalBudgetSum / items.length : 0;
      statAvgBudget.textContent = ApiService.formatCurrency(avg);
    }

    // Render Recent Table
    if (recentTableBody) {
      if (items.length === 0) {
        recentTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="empty-state">
              No recommendations generated yet. Start with one of the planners above!
            </td>
          </tr>
        `;
      } else {
        recentTableBody.innerHTML = items
          .slice(0, 5)
          .map((item) => {
            const plannerLabel =
              item.planner_type === "home"
                ? "Home Interior"
                : item.planner_type === "party"
                ? "Party & Event"
                : "Jewelry Styling";
            const budget = item.response_data?.budget || 0;
            const recCount = (item.response_data?.recommendations || []).length;
            const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return `
              <tr>
                <td><strong>${plannerLabel}</strong></td>
                <td>${dateStr}</td>
                <td class="tabular-nums">${ApiService.formatCurrency(budget)}</td>
                <td>${recCount} items</td>
                <td>
                  <button class="btn btn-outline btn-sm view-history-btn" data-id="${item.id}">
                    View Result
                  </button>
                </td>
              </tr>
            `;
          })
          .join("");

        // Attach view buttons
        document.querySelectorAll(".view-history-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            try {
              const detail = await ApiService.getHistoryItem(id);
              localStorage.setItem(
                window.APP_CONFIG.LAST_REC_STORAGE_KEY,
                JSON.stringify(detail.response_data)
              );
              window.location.href = "recommendations.html";
            } catch (err) {
              alert("Could not load recommendation: " + err.message);
            }
          });
        });
      }
    }
  } catch (err) {
    console.warn("Could not fetch dashboard history:", err);
  }
});
