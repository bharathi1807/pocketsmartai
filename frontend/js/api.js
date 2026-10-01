/**
 * PocketSmart AI - Centralized REST API Service
 */

const ApiService = {
  get baseUrl() {
    return window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : "http://localhost:8000";
  },

  getToken() {
    return localStorage.getItem(window.APP_CONFIG.TOKEN_STORAGE_KEY) || "";
  },

  setToken(token) {
    localStorage.setItem(window.APP_CONFIG.TOKEN_STORAGE_KEY, token);
  },

  getUser() {
    const raw = localStorage.getItem(window.APP_CONFIG.USER_STORAGE_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(window.APP_CONFIG.USER_STORAGE_KEY, JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem(window.APP_CONFIG.TOKEN_STORAGE_KEY);
    localStorage.removeItem(window.APP_CONFIG.USER_STORAGE_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  getHeaders(isMultipart = false) {
    const headers = {};
    if (!isMultipart) {
      headers["Content-Type"] = "application/json";
    }
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const isMultipart = options.body instanceof FormData;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(isMultipart),
        ...(options.headers || {}),
      },
    };

    try {
      const res = await fetch(url, config);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          this.clearAuth();
        }
        const errorMsg =
          (data && (data.detail || data.message)) ||
          `Request failed with status ${res.status}`;
        throw new Error(errorMsg);
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async registerUser(name, email, password) {
    const data = await this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    if (data.access_token) {
      this.setToken(data.access_token);
      this.setUser(data.user);
    }
    return data;
  },

  async loginUser(email, password) {
    const data = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      this.setToken(data.access_token);
      this.setUser(data.user);
    }
    return data;
  },

  async logoutUser() {
    try {
      if (this.isAuthenticated()) {
        await this.request("/api/auth/logout", { method: "POST" });
      }
    } catch {
      // Graceful local cleanup
    } finally {
      this.clearAuth();
    }
  },

  async getCurrentUser() {
    return await this.request("/api/auth/me", { method: "GET" });
  },

  async getSessionInfo() {
    return await this.request("/api/session-info", { method: "GET" });
  },

  // Local Guest Storage
  getLocalHistory() {
    try {
      const raw = localStorage.getItem("pocketsmart_local_history");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveToLocalHistory(item) {
    try {
      const existing = this.getLocalHistory();
      const updated = [item, ...existing.filter((i) => i.id !== item.id)].slice(0, 50);
      localStorage.setItem("pocketsmart_local_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  deleteFromLocalHistory(id) {
    try {
      const existing = this.getLocalHistory();
      const updated = existing.filter((i) => i.id !== Number(id) && i.id !== id);
      localStorage.setItem("pocketsmart_local_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  // Planners Endpoints (fully available before login/signup)
  async generateHomeRecommendation(payload) {
    const data = await this.request("/api/planners/home", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    localStorage.setItem(window.APP_CONFIG.LAST_REC_STORAGE_KEY, JSON.stringify(data));
    this.saveToLocalHistory({
      id: Date.now(),
      planner_type: "home",
      created_at: new Date().toISOString(),
      request_data: payload,
      response_data: data,
    });
    return data;
  },

  async generatePartyRecommendation(payload) {
    const data = await this.request("/api/planners/party", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    localStorage.setItem(window.APP_CONFIG.LAST_REC_STORAGE_KEY, JSON.stringify(data));
    this.saveToLocalHistory({
      id: Date.now(),
      planner_type: "party",
      created_at: new Date().toISOString(),
      request_data: payload,
      response_data: data,
    });
    return data;
  },

  async generateJewelryRecommendation(formDataOrObject) {
    const isFormData = formDataOrObject instanceof FormData;
    const data = await this.request("/api/planners/jewelry", {
      method: "POST",
      body: isFormData ? formDataOrObject : JSON.stringify(formDataOrObject),
    });
    localStorage.setItem(window.APP_CONFIG.LAST_REC_STORAGE_KEY, JSON.stringify(data));
    this.saveToLocalHistory({
      id: Date.now(),
      planner_type: "jewelry",
      created_at: new Date().toISOString(),
      request_data: isFormData ? {} : formDataOrObject,
      response_data: data,
    });
    return data;
  },

  // History Endpoints (works seamlessly for guests and logged in users)
  async getHistory() {
    const local = this.getLocalHistory();
    if (!this.isAuthenticated()) {
      return { total_count: local.length, items: local };
    }
    try {
      const server = await this.request("/api/history", { method: "GET" });
      const serverItems = server.items || [];
      const combined = [...serverItems];
      for (const loc of local) {
        if (!combined.some((s) => s.id === loc.id)) {
          combined.push(loc);
        }
      }
      return { total_count: combined.length, items: combined };
    } catch {
      return { total_count: local.length, items: local };
    }
  },

  async getHistoryItem(id) {
    if (!this.isAuthenticated()) {
      const local = this.getLocalHistory();
      const found = local.find((i) => i.id === Number(id) || i.id === id);
      if (found) return found;
    }
    return await this.request(`/api/history/${id}`, { method: "GET" });
  },

  async deleteHistoryItem(id) {
    this.deleteFromLocalHistory(id);
    if (this.isAuthenticated()) {
      try {
        return await this.request(`/api/history/${id}`, { method: "DELETE" });
      } catch {
        // ignore
      }
    }
    return { message: "Deleted from local history" };
  },

  formatCurrency(value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  },
};

window.ApiService = ApiService;
