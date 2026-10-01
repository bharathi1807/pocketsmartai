/**
 * PocketSmart AI - Recommendation History Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("historyTableBody");
  const countEl = document.getElementById("historyTotalCount");
  const emptyState = document.getElementById("historyEmptyState");

  // Guests are welcome: load local or server history
  loadHistory();

  async function loadHistory() {
    try {
      const res = await ApiService.getHistory();
      const items = (res && res.items) || [];

      if (countEl) countEl.textContent = `${items.length} saved sessions`;

      if (items.length === 0) {
        if (tableBody) tableBody.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      if (emptyState) emptyState.style.display = "none";
      if (tableBody) {
        tableBody.innerHTML = items
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
              hour: "2-digit",
              minute: "2-digit",
            });

            return `
              <tr id="row-${item.id}">
                <td><strong>${plannerLabel}</strong></td>
                <td>${dateStr}</td>
                <td class="tabular-nums">${ApiService.formatCurrency(budget)}</td>
                <td>${recCount} suggestions</td>
                <td>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-outline btn-sm view-btn" data-id="${item.id}">
                      View
                    </button>
                    <button class="btn btn-outline btn-sm delete-btn" data-id="${item.id}" style="color: var(--accent-danger);">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("");

        // Attach View Buttons
        document.querySelectorAll(".view-btn").forEach((btn) => {
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
              alert("Error loading recommendation: " + err.message);
            }
          });
        });

        // Attach Delete Buttons
        document.querySelectorAll(".delete-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const id = e.currentTarget.getAttribute("data-id");
            if (confirm(`Are you sure you want to delete session #${id}?`)) {
              try {
                await ApiService.deleteHistoryItem(id);
                document.getElementById(`row-${id}`)?.remove();
                loadHistory();
              } catch (err) {
                alert("Error deleting item: " + err.message);
              }
            }
          });
        });
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }
});
