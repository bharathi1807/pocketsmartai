/**
 * PocketSmart AI - Party & Event Budget Planner Page Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // Enforce login requirement for party planner
  if (!ApiService.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("partyPlannerForm");
  const errorAlert = document.getElementById("plannerErrorAlert");
  const submitBtn = document.getElementById("submitPlannerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const budget = parseFloat(document.getElementById("totalBudget").value);
    const guestCount = parseInt(document.getElementById("guestCount").value, 10);
    const eventType = document.getElementById("eventType").value;
    const venueReq = document.getElementById("venueRequirements").value.trim();
    const foodReq = document.getElementById("foodRequirements").value.trim();
    const decorReq = document.getElementById("decorRequirements").value.trim();
    const entertainmentReq = document.getElementById("entertainmentRequirements").value.trim();
    const accommodationReq = document.getElementById("accommodationRequirements").value.trim();

    if (isNaN(budget) || budget <= 0) {
      showError("Please enter a valid event budget.");
      return;
    }

    if (isNaN(guestCount) || guestCount < 1) {
      showError("Guest count must be at least 1 person.");
      return;
    }

    hideError();
    setLoading(true);

    const payload = {
      total_budget: budget,
      guest_count: guestCount,
      event_type: eventType,
      venue_requirements: venueReq || null,
      food_requirements: foodReq || null,
      decoration_requirements: decorReq || null,
      entertainment_requirements: entertainmentReq || null,
      accommodation_requirements: accommodationReq || null,
    };

    try {
      await ApiService.generatePartyRecommendation(payload);
      window.location.href = "recommendations.html";
    } catch (err) {
      showError(err.message || "Failed to generate party recommendations. Please try again.");
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
      ? '<span class="spinner"></span> Balancing Catering, Venue & Entertainment...'
      : 'Generate Party Budget Plan';
  }
});
