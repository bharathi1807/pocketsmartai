/**
 * PocketSmart AI - Home Interior Planner Page Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // Enforce login requirement for home interior planner
  if (!ApiService.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("homePlannerForm");
  const errorAlert = document.getElementById("plannerErrorAlert");
  const submitBtn = document.getElementById("submitPlannerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const budget = parseFloat(document.getElementById("totalBudget").value);
    const roomType = document.getElementById("roomType").value;
    const roomQuantity = parseInt(document.getElementById("roomQuantity").value, 10) || 1;
    const stylePreference = document.getElementById("stylePreference").value;
    const furnitureReq = document.getElementById("furnitureRequirements").value.trim();
    const lightingReq = document.getElementById("lightingRequirements").value.trim();
    const ceilingFanReq = document.getElementById("ceilingFanRequirements").value.trim();
    const diningTableReq = document.getElementById("diningTableRequirements").value.trim();
    const otherReq = document.getElementById("otherRequirements").value.trim();

    if (isNaN(budget) || budget <= 0) {
      showError("Please enter a valid budget greater than zero.");
      return;
    }

    hideError();
    setLoading(true);

    const payload = {
      total_budget: budget,
      room_type: roomType,
      room_quantity: roomQuantity,
      style_preference: stylePreference,
      furniture_requirements: furnitureReq || null,
      lighting_requirements: lightingReq || null,
      ceiling_fan_requirements: ceilingFanReq || null,
      dining_table_requirements: diningTableReq || null,
      other_requirements: otherReq || null,
    };

    try {
      await ApiService.generateHomeRecommendation(payload);
      window.location.href = "recommendations.html";
    } catch (err) {
      showError(err.message || "Failed to generate recommendations. Please try again.");
      setLoading(false);
    }
  });

  function showError(msg) {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.style.display = "block";
    }
  }

  function hideError() {
    if (errorAlert) {
      errorAlert.style.display = "none";
    }
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading
      ? '<span class="spinner"></span> Analyzing Interior Budget...'
      : 'Generate Smart Recommendations';
  }
});
