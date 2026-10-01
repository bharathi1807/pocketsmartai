/**
 * PocketSmart AI - Centralized Frontend Configuration
 *
 * To point to a deployed backend, simply set window.__POCKETSMART_API_URL__
 * or change the default fallback here.
 */

const CONFIG = {
  // Uses window injected URL, current origin if running full-stack, or default localhost:8000
  API_BASE_URL: (function () {
    if (window.__POCKETSMART_API_URL__) {
      return window.__POCKETSMART_API_URL__;
    }
    // If served from same host (e.g. deployed full-stack)
    if (window.location.port === "3000" || window.location.hostname !== "localhost") {
      return window.location.origin;
    }
    return "http://localhost:8000";
  })(),
  TOKEN_STORAGE_KEY: "pocketsmart_token",
  USER_STORAGE_KEY: "pocketsmart_user",
  LAST_REC_STORAGE_KEY: "pocketsmart_last_recommendation",
};

window.APP_CONFIG = CONFIG;
