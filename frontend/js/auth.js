/**
 * PocketSmart AI - Authentication Page Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is already logged in
  const currentUser = ApiService.getUser();
  if (currentUser && (window.location.pathname.endsWith("login.html") || window.location.pathname.endsWith("register.html"))) {
    window.location.href = "dashboard.html";
    return;
  }

  // Setup Login Form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const errorAlert = document.getElementById("errorAlert");
      const submitBtn = loginForm.querySelector("button[type='submit']");

      errorAlert.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';

      try {
        await ApiService.loginUser(email, password);
        window.location.href = "dashboard.html";
      } catch (err) {
        errorAlert.textContent = err.message || "Failed to log in. Please check your credentials.";
        errorAlert.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
      }
    });

    // Quick demo login helper button
    const demoBtn = document.getElementById("fillDemoBtn");
    if (demoBtn) {
      demoBtn.addEventListener("click", () => {
        document.getElementById("email").value = "alex.mercer@example.com";
        document.getElementById("password").value = "SecurePassword123!";
      });
    }
  }

  // Setup Register Form
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const errorAlert = document.getElementById("errorAlert");
      const submitBtn = registerForm.querySelector("button[type='submit']");

      errorAlert.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

      try {
        await ApiService.registerUser(name, email, password);
        window.location.href = "dashboard.html";
      } catch (err) {
        errorAlert.textContent = err.message || "Failed to create account. Please try again.";
        errorAlert.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
    });
  }

  // Global Logout Button Handler for Navigation
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await ApiService.logoutUser();
      window.location.href = "login.html";
    });
  }

  // Global Auth Display in Top Navigation
  const authZone = document.getElementById("headerAuthZone");
  if (authZone) {
    const user = ApiService.getUser();
    if (user) {
      authZone.innerHTML = `
        <span style="font-size: 0.85rem; color: var(--text-secondary); margin-right: 8px;">
          ${user.name}
        </span>
        <button id="logoutBtn" class="btn btn-outline btn-sm">Log Out</button>
      `;
      document.getElementById("logoutBtn").addEventListener("click", async () => {
        await ApiService.logoutUser();
        window.location.href = "login.html";
      });
    } else {
      authZone.innerHTML = `
        <a href="login.html" class="btn btn-outline btn-sm">Sign In</a>
        <a href="register.html" class="btn btn-primary btn-sm">Register</a>
      `;
    }
  }
});
