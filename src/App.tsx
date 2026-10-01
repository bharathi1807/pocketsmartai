import React, { useState, useEffect } from "react";
import {
  Home,
  PartyPopper,
  Sparkles,
  History,
  LayoutDashboard,
  LogOut,
  LogIn,
  Search,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Printer,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Layers,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Zap,
  Crown,
} from "lucide-react";

interface BudgetSummary {
  total_budget: number;
  allocated: number;
  remaining: number;
  allocation_percentage: number;
}

interface RecommendationItem {
  category: string;
  name: string;
  description: string;
  estimated_price: number;
  platform: string;
  reason: string;
  external_search_query?: string;
}

interface RecommendationResponse {
  planner_type: string;
  budget: number;
  budget_summary: BudgetSummary;
  recommendations: RecommendationItem[];
  tips: string[];
  is_fallback: boolean;
  disclaimer: string;
  trials_used?: number;
  max_trials?: number;
  plan?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  trials_used?: number;
  plan?: "free" | "pro";
  max_trials?: number;
}

interface HistoryItem {
  id: number;
  planner_type: string;
  created_at: string;
  request_data: any;
  response_data: RecommendationResponse;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "home" | "party" | "jewelry" | "recommendations" | "history">("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authentication Modal & Form State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Upgrade Plan Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeSuccessMsg, setUpgradeSuccessMsg] = useState<string | null>(null);

  // Active Recommendation Data
  const [currentRec, setCurrentRec] = useState<RecommendationResponse | null>(null);

  // History Records
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  // Navigation Guard: users MUST login or signup first to access home, party, or jewelry
  const handleSelectTab = (tab: "dashboard" | "home" | "party" | "jewelry" | "recommendations" | "history") => {
    if ((tab === "home" || tab === "party" || tab === "jewelry") && !user) {
      setAuthMode("login");
      const names: Record<string, string> = {
        home: "Home Interior Planner",
        party: "Party & Event Planner",
        jewelry: "Jewelry Styling Planner",
      };
      setAuthError(`Login or Sign Up Required: You must log in or sign up first to access the ${names[tab] || "planner"}. Every registered user gets 3 Free Trials.`);
      setIsAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  // Initialize session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("pocketsmart_token");
    const savedUser = localStorage.getItem("pocketsmart_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("pocketsmart_token");
        localStorage.removeItem("pocketsmart_user");
      }
    }
  }, []);

  // Forms State
  const [homeForm, setHomeForm] = useState({
    total_budget: 50000,
    room_type: "Living Room",
    room_quantity: 1,
    style_preference: "Modern Minimalist",
    furniture_requirements: "3-seater modular sofa, oak coffee table, media console",
    lighting_requirements: "Warm 3000K diffused ceiling spotlights and floor lamp",
    ceiling_fan_requirements: "Silent BLDC motor fan with wooden blades",
    dining_table_requirements: "4-seater compact oakwood dining table",
    other_requirements: "Neutral textured wool rug and acoustic linen drapes",
  });

  const [partyForm, setPartyForm] = useState({
    total_budget: 35000,
    guest_count: 25,
    event_type: "Birthday Party",
    venue_requirements: "Rooftop terrace with ambient evening lighting",
    food_requirements: "Welcome mocktails, 3 appetizers, 2 mains buffet, cake",
    decoration_requirements: "Balloon garland, fairy lights canopy, photo backdrop",
    entertainment_requirements: "Wireless Bluetooth PA speaker system with microphones",
    accommodation_requirements: "None",
  });

  const [jewelryForm, setJewelryForm] = useState({
    budget: 15000,
    occasion: "Wedding / Reception",
    jewelry_type: "Necklace & Earring Set",
    preferred_style: "Contemporary Diamond",
    preferred_color: "Emerald green",
    material_preference: "18K Rose Gold",
    outfit_description: "Deep V-neck emerald evening gown with satin sheen",
  });

  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [outfitPreview, setOutfitPreview] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Fetch history (merges local storage and server if authenticated)
  const fetchHistory = async () => {
    let localItems: HistoryItem[] = [];
    try {
      const raw = localStorage.getItem("pocketsmart_local_history");
      if (raw) localItems = JSON.parse(raw);
    } catch {
      localItems = [];
    }

    if (token) {
      try {
        const res = await fetch("/api/history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const serverItems = data.items || [];
          const combined = [...serverItems];
          for (const loc of localItems) {
            if (!combined.some((s) => s.id === loc.id)) {
              combined.push(loc);
            }
          }
          setHistoryList(combined);
          return;
        }
      } catch {
        // fallback to local
      }
    }

    setHistoryList(localItems);
  };

  const saveToHistory = (item: HistoryItem) => {
    setHistoryList((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
    try {
      const existing = JSON.parse(localStorage.getItem("pocketsmart_local_history") || "[]");
      const updated = [item, ...existing.filter((i: any) => i.id !== item.id)].slice(0, 50);
      localStorage.setItem("pocketsmart_local_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      authMode === "login"
        ? { email: authEmail.trim(), password: authPassword }
        : { name: authName.trim(), email: authEmail.trim(), password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed. Please check your credentials.");
      }

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("pocketsmart_token", data.access_token);
      localStorage.setItem("pocketsmart_user", JSON.stringify(data.user));
      setIsAuthModalOpen(false);
      setAuthPassword("");
      setAuthEmail("");
      setAuthName("");
    } catch (err: any) {
      setAuthError(err.message || "An unexpected authentication error occurred.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    } finally {
      setUser(null);
      setToken("");
      localStorage.removeItem("pocketsmart_token");
      localStorage.removeItem("pocketsmart_user");
      // Keep local history so guest still has their generated plans
      fetchHistory();
    }
  };

  const autofillDemo = () => {
    setAuthEmail("alex.mercer@example.com");
    setAuthPassword("SecurePassword123!");
    if (authMode === "register") {
      setAuthName("Alex Mercer");
    }
  };

  const handleUpgradeToPro = async () => {
    if (!token) {
      setAuthMode("login");
      setAuthError("Please sign in or create an account first to upgrade.");
      setIsUpgradeModalOpen(false);
      setIsAuthModalOpen(true);
      return;
    }
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/user/upgrade", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to upgrade plan.");
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("pocketsmart_user", JSON.stringify(data.user));
      }
      setUpgradeSuccessMsg("🎉 Upgraded to PocketSmart Pro! You now have unlimited generations.");
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
        setUpgradeSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upgrade plan.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleResetTrials = async () => {
    if (!token) return;
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/user/reset-trials", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("pocketsmart_user", JSON.stringify(data.user));
      }
      setUpgradeSuccessMsg("Trials reset to 0 of 3 used (Demo Mode).");
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
        setUpgradeSuccessMsg(null);
      }, 1200);
    } catch {
      // ignore
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOutfitFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOutfitPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setOutfitFile(null);
    setOutfitPreview(null);
  };

  // Submit Home Planner (requires login & max 3 free trials)
  const handleHomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      setAuthMode("login");
      setAuthError("You must log in or sign up first to access the Home Interior Planner.");
      setIsAuthModalOpen(true);
      return;
    }

    if (user.plan !== "pro" && (user.trials_used || 0) >= 3) {
      setErrorMsg("Free trial limit reached (3/3 used). Please upgrade your plan to continue.");
      setIsUpgradeModalOpen(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/planners/home", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(homeForm),
      });
      const data = await res.json();

      if (res.status === 401) {
        setAuthMode("login");
        setAuthError(data.detail || "Authentication required. Please sign in or register.");
        setIsAuthModalOpen(true);
        return;
      }

      if (res.status === 403 && data.trial_exceeded) {
        setErrorMsg(data.detail || "Free trial limit reached (3/3 used). Please upgrade your plan to continue.");
        const updated = { ...user, trials_used: data.trials_used || 3 };
        setUser(updated);
        localStorage.setItem("pocketsmart_user", JSON.stringify(updated));
        setIsUpgradeModalOpen(true);
        return;
      }

      if (!res.ok) throw new Error(data.detail || "Failed to generate home recommendations");

      // Update trials in user state
      if (data.trials_used !== undefined) {
        const updated: User = { ...user, trials_used: data.trials_used, plan: data.plan || user.plan };
        setUser(updated);
        localStorage.setItem("pocketsmart_user", JSON.stringify(updated));
      }

      setCurrentRec(data);
      setActiveTab("recommendations");

      saveToHistory({
        id: Date.now(),
        planner_type: "home",
        created_at: new Date().toISOString(),
        request_data: homeForm,
        response_data: data,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Submit Party Planner (requires login & max 3 free trials)
  const handlePartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      setAuthMode("login");
      setAuthError("You must log in or sign up first to access the Party Planner.");
      setIsAuthModalOpen(true);
      return;
    }

    if (user.plan !== "pro" && (user.trials_used || 0) >= 3) {
      setErrorMsg("Free trial limit reached (3/3 used). Please upgrade your plan to continue.");
      setIsUpgradeModalOpen(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/planners/party", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(partyForm),
      });
      const data = await res.json();

      if (res.status === 401) {
        setAuthMode("login");
        setAuthError(data.detail || "Authentication required. Please sign in or register.");
        setIsAuthModalOpen(true);
        return;
      }

      if (res.status === 403 && data.trial_exceeded) {
        setErrorMsg(data.detail || "Free trial limit reached (3/3 used). Please upgrade your plan to continue.");
        const updated = { ...user, trials_used: data.trials_used || 3 };
        setUser(updated);
        localStorage.setItem("pocketsmart_user", JSON.stringify(updated));
        setIsUpgradeModalOpen(true);
        return;
      }

      if (!res.ok) throw new Error(data.detail || "Failed to generate party recommendations");

      if (data.trials_used !== undefined) {
        const updated: User = { ...user, trials_used: data.trials_used, plan: data.plan || user.plan };
        setUser(updated);
        localStorage.setItem("pocketsmart_user", JSON.stringify(updated));
      }

      setCurrentRec(data);
      setActiveTab("recommendations");

      saveToHistory({
        id: Date.now(),
        planner_type: "party",
        created_at: new Date().toISOString(),
        request_data: partyForm,
        response_data: data,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Submit Jewelry Planner (requires login & max 3 free trials)
  const handleJewelrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      setAuthMode("login");
      setAuthError("You must log in or sign up first to access the Jewelry Styling Planner.");
      setIsAuthModalOpen(true);
      return;
    }

    if (user.plan !== "pro" && (user.trials_used || 0) >= 3) {
      setErrorMsg("Free trial limit reached (3/3 used). Please upgrade your plan to continue.");
      setIsUpgradeModalOpen(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("budget", jewelryForm.budget.toString());
      formData.append("occasion", jewelryForm.occasion);
      formData.append("jewelry_type", jewelryForm.jewelry_type);
      formData.append("preferred_style", jewelryForm.preferred_style);
      formData.append("material_preference", jewelryForm.material_preference);
      if (jewelryForm.preferred_color) formData.append("preferred_color", jewelryForm.preferred_color);
      if (jewelryForm.outfit_description) formData.append("outfit_description", jewelryForm.outfit_description);
      if (outfitFile) formData.append("image", outfitFile);

      const res = await fetch("/api/planners/jewelry", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();

      if (res.status === 401) {
        setAuthMode("login");
        setAuthError(data.detail || "Authentication required. Please sign in or register.");
        setIsAuthModalOpen(true);
        return;
      }

      if (res.status === 403 && data.trial_exceeded) {
        setErrorMsg(data.detail || "Free trial limit reached (3/3 used). Please upgrade your plan to continue.");
        const updated = { ...user, trials_used: data.trials_used || 3 };
        setUser(updated);
        localStorage.setItem("pocketsmart_user", JSON.stringify(updated));
        setIsUpgradeModalOpen(true);
        return;
      }

      if (!res.ok) throw new Error(data.detail || "Failed to generate jewelry recommendations");

      if (data.trials_used !== undefined) {
        const updated: User = { ...user, trials_used: data.trials_used, plan: data.plan || user.plan };
        setUser(updated);
        localStorage.setItem("pocketsmart_user", JSON.stringify(updated));
      }

      setCurrentRec(data);
      setActiveTab("recommendations");

      saveToHistory({
        id: Date.now(),
        planner_type: "jewelry",
        created_at: new Date().toISOString(),
        request_data: { ...jewelryForm, has_image: Boolean(outfitFile) },
        response_data: data,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Delete history item
  const handleDeleteHistory = async (id: number) => {
    if (token) {
      try {
        await fetch(`/api/history/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    // Delete from state and localStorage
    setHistoryList((prev) => prev.filter((item) => item.id !== id));
    try {
      const existing = JSON.parse(localStorage.getItem("pocketsmart_local_history") || "[]");
      const updated = existing.filter((item: any) => item.id !== id);
      localStorage.setItem("pocketsmart_local_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract: 1 Row, 3 Zones */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50 px-6 flex items-center justify-between">
        {/* Zone 1: Single Brand Wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("dashboard");
          }}
          className="text-lg font-bold tracking-tight text-white flex items-center gap-2"
        >
          <span>PocketSmart</span>
          <span className="text-indigo-400 font-extrabold">AI</span>
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => handleSelectTab("dashboard")}
            className={`transition-colors flex items-center gap-1.5 ${
              activeTab === "dashboard" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => handleSelectTab("home")}
            className={`transition-colors flex items-center gap-1.5 ${
              activeTab === "home" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home Interior</span>
          </button>
          <button
            onClick={() => handleSelectTab("party")}
            className={`transition-colors flex items-center gap-1.5 ${
              activeTab === "party" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <PartyPopper className="w-4 h-4" />
            <span>Party Planner</span>
          </button>
          <button
            onClick={() => handleSelectTab("jewelry")}
            className={`transition-colors flex items-center gap-1.5 ${
              activeTab === "jewelry" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Jewelry Styling</span>
          </button>
          <button
            onClick={() => handleSelectTab("history")}
            className={`transition-colors flex items-center gap-1.5 ${
              activeTab === "history" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action / Profile */}
        <div className="flex items-center gap-2.5">
          <a
            href="/vanilla/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
            title="Open pure HTML/CSS/Vanilla JS version"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Vanilla UI</span>
          </a>

          {user ? (
            <div className="flex items-center gap-2">
              {user.plan === "pro" ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 rounded-lg">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Pro Unlimited</span>
                </span>
              ) : (
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-800/80 rounded-lg hover:bg-amber-900/60 transition-colors shadow-sm"
                  title="3 Free Trials - Click to Upgrade"
                >
                  <Zap className="w-3 h-3 fill-current text-amber-400" />
                  <span>Trial: {user.trials_used || 0}/3</span>
                  <span className="underline text-amber-200">Upgrade</span>
                </button>
              )}

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="text-xs text-slate-300 font-medium hidden sm:inline max-w-[120px] truncate">
                  {user.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                title="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Register</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Welcome back, {user ? user.name : "Guest Planner"}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Plan your home interior, celebrations, and jewelry styling within intelligent budget bounds.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectTab("home")}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {!user && <Lock className="w-3.5 h-3.5" />}
                  <span>+ New Budget Plan</span>
                </button>
              </div>
            </div>

            {!user ? (
              <div className="p-4 sm:p-5 rounded-xl bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Login or Sign Up Required to Access Planners</div>
                    <div className="text-amber-300/90 text-xs mt-0.5">
                      You must log in or sign up first to access the Home Interior, Party & Event, and Jewelry Styling Planners. Every registered user gets <strong>3 Free Trials</strong>!
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError(null);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-4 py-2 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError(null);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-4 py-2 font-semibold text-slate-200 border border-slate-700 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </button>
                  <button
                    onClick={async () => {
                      setAuthLoading(true);
                      try {
                        const res = await fetch("/api/auth/login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: "alex.mercer@example.com", password: "SecurePassword123!" }),
                        });
                        const data = await res.json();
                        if (data.access_token) {
                          setToken(data.access_token);
                          setUser(data.user);
                          localStorage.setItem("pocketsmart_token", data.access_token);
                          localStorage.setItem("pocketsmart_user", JSON.stringify(data.user));
                        }
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className="px-3 py-2 text-xs font-medium text-amber-300 hover:text-amber-200 underline hidden lg:inline"
                    title="Sign in with demo account"
                  >
                    ✨ 1-Click Demo
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚡</span>
                  <div>
                    <span className="text-slate-300 font-medium">Logged in as <strong className="text-white">{user.name}</strong></span>
                    <span className="text-slate-400"> — </span>
                    <span className={user.plan !== "pro" && (user.trials_used || 0) >= 3 ? "text-amber-400 font-bold" : "text-emerald-400 font-medium"}>
                      {user.plan === "pro"
                        ? "PocketSmart Pro Active (Unlimited Generations)"
                        : `Free Trial: ${user.trials_used || 0} of 3 used (${Math.max(0, 3 - (user.trials_used || 0))} remaining)`}
                    </span>
                  </div>
                </div>
                {user.plan !== "pro" && (
                  <button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-3 py-1.5 font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Upgrade Plan</span>
                  </button>
                )}
              </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saved Sessions</div>
                <div className="text-2xl font-bold text-white mt-1 tabular-nums font-mono">{historyList.length}</div>
                <div className="text-xs text-slate-400 mt-1">Stored across all 3 planner engines</div>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Planned</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums font-mono">
                  {formatCurrency(
                    historyList.reduce((acc, it) => acc + (Number(it.response_data?.budget) || 0), 0)
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">Active allocation sum</div>
              </div>
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Model Status</div>
                <div className="text-xl font-bold text-indigo-400 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Gemini 3.8 Flash</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">Fail-safe local fallback enabled</div>
              </div>
            </div>

            {/* Planners Cards Grid */}
            <div>
              <h2 className="text-base font-semibold text-slate-200 mb-4">Select a Planning Engine</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Home Card */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors relative">
                  {!user && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800/60 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Login Required
                    </span>
                  )}
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                      <Home className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Home Interior</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Balance seating, storage, warm 3000K lighting, and silent BLDC fans tailored to your room layout.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectTab("home")}
                    className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      !user
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                        : "text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 hover:bg-indigo-900/60"
                    }`}
                  >
                    {!user ? <Lock className="w-3.5 h-3.5" /> : null}
                    <span>{!user ? "Sign In to Access Planner" : "Launch Interior Planner"}</span>
                    {user && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Party Card */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors relative">
                  {!user && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800/60 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Login Required
                    </span>
                  )}
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                      <PartyPopper className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Party & Event Budget</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Categorize catering per head, venue hire, thematic floral/balloon backdrops, and sound/DJ systems.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectTab("party")}
                    className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      !user
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                        : "text-purple-300 bg-purple-950/60 border border-purple-800/50 hover:bg-purple-900/60"
                    }`}
                  >
                    {!user ? <Lock className="w-3.5 h-3.5" /> : null}
                    <span>{!user ? "Sign In to Access Planner" : "Launch Party Planner"}</span>
                    {user && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Jewelry Card */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors relative">
                  {!user && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800/60 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Login Required
                    </span>
                  )}
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Jewelry Styling</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Curate necklaces, earrings, and bangles with optional multimodal outfit photo neckline pairing.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectTab("jewelry")}
                    className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      !user
                        ? "bg-pink-600 hover:bg-pink-500 text-white shadow-sm"
                        : "text-pink-300 bg-pink-950/60 border border-pink-800/50 hover:bg-pink-900/60"
                    }`}
                  >
                    {!user ? <Lock className="w-3.5 h-3.5" /> : null}
                    <span>{!user ? "Sign In to Access Planner" : "Launch Jewelry Planner"}</span>
                    {user && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Recommendations Table */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-200">Recent Recommendation History</h2>
                <button
                  onClick={() => setActiveTab("history")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  View All History →
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No recommendation sessions yet. Start planning by selecting one of the modules above!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Planner</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Budget</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {historyList.slice(0, 5).map((it) => (
                        <tr key={it.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-white capitalize flex items-center gap-2">
                            {it.planner_type === "home" && <Home className="w-4 h-4 text-indigo-400" />}
                            {it.planner_type === "party" && <PartyPopper className="w-4 h-4 text-purple-400" />}
                            {it.planner_type === "jewelry" && <Sparkles className="w-4 h-4 text-pink-400" />}
                            <span>{it.planner_type} Planner</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {new Date(it.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200">
                            {formatCurrency(it.response_data?.budget)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {it.response_data?.recommendations?.length || 0} items
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setCurrentRec(it.response_data);
                                setActiveTab("recommendations");
                              }}
                              className="px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 rounded-md hover:bg-indigo-900/80"
                            >
                              View Plan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. HOME PLANNER TAB */}
        {activeTab === "home" && (
          !user ? (
            <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Login or Sign Up Required</h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                You must login or sign up first to access the Home Interior Planner.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Continue</span>
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Account</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAuthLoading(true);
                    try {
                      const res = await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: "alex.mercer@example.com", password: "SecurePassword123!" }),
                      });
                      const data = await res.json();
                      if (data.access_token) {
                        setToken(data.access_token);
                        setUser(data.user);
                        localStorage.setItem("pocketsmart_token", data.access_token);
                        localStorage.setItem("pocketsmart_user", JSON.stringify(data.user));
                      }
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-1 text-xs text-slate-400 hover:text-indigo-300 transition-colors underline pt-2"
                >
                  ✨ Instant Access with Demo Account
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 p-7 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-white">Home Interior Planner</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Furnish your spaces with intelligent allocation across furniture, lighting, ventilation, and decor.
                  </p>
                </div>

                <form onSubmit={handleHomeSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Total Budget ($)</label>
                      <input
                        type="number"
                        required
                        min={500}
                        step={100}
                        value={homeForm.total_budget}
                        onChange={(e) => setHomeForm({ ...homeForm, total_budget: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono tabular-nums focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Room Type</label>
                      <select
                        value={homeForm.room_type}
                        onChange={(e) => setHomeForm({ ...homeForm, room_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        <option value="Living Room">Living Room</option>
                        <option value="Master Bedroom">Master Bedroom</option>
                        <option value="Studio Apartment">Studio Apartment</option>
                        <option value="Home Office / Study">Home Office / Study</option>
                        <option value="Dining & Kitchen">Dining & Kitchen</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Room Quantity</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={homeForm.room_quantity}
                        onChange={(e) => setHomeForm({ ...homeForm, room_quantity: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono tabular-nums focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Design Style</label>
                      <select
                        value={homeForm.style_preference}
                        onChange={(e) => setHomeForm({ ...homeForm, style_preference: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        <option value="Modern Minimalist">Modern Minimalist</option>
                        <option value="Scandinavian">Scandinavian</option>
                        <option value="Contemporary Warm">Contemporary Warm</option>
                        <option value="Industrial Loft">Industrial Loft</option>
                        <option value="Boho Chic">Boho Chic</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Furniture Requirements</label>
                    <input
                      type="text"
                      value={homeForm.furniture_requirements}
                      onChange={(e) => setHomeForm({ ...homeForm, furniture_requirements: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Lighting Requirements</label>
                      <input
                        type="text"
                        value={homeForm.lighting_requirements}
                        onChange={(e) => setHomeForm({ ...homeForm, lighting_requirements: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ceiling Fan & Fixtures</label>
                      <input
                        type="text"
                        value={homeForm.ceiling_fan_requirements}
                        onChange={(e) => setHomeForm({ ...homeForm, ceiling_fan_requirements: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Dining Table Requirements (Optional)</label>
                    <input
                      type="text"
                      value={homeForm.dining_table_requirements}
                      onChange={(e) => setHomeForm({ ...homeForm, dining_table_requirements: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Other Requirements (Rugs, Curtains, Accents)</label>
                    <textarea
                      rows={2}
                      value={homeForm.other_requirements}
                      onChange={(e) => setHomeForm({ ...homeForm, other_requirements: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>

                  {/* Free Trial Limit and Quota Indicator */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                      <span>Plan & Quota</span>
                      <span className={user.plan !== "pro" && (user.trials_used || 0) >= 3 ? "text-amber-400 font-bold" : "text-slate-300 font-medium"}>
                        {user.plan === "pro"
                          ? "⚡ Unlimited Generations (Pro Plan)"
                          : `⚡ Free Trial: ${user.trials_used || 0} of 3 used (${Math.max(0, 3 - (user.trials_used || 0))} remaining)`}
                      </span>
                    </div>

                    {user.plan !== "pro" && (user.trials_used || 0) >= 3 ? (
                      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                          <div>
                            <div className="font-bold text-white text-xs">Free trial limit reached (3/3 used)</div>
                            <div className="text-[11px] text-amber-300">You have completed your 3 free trials. Please upgrade your plan to continue.</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUpgradeModalOpen(true)}
                          className="px-4 py-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-lg shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Upgrade Plan</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>Distributing Interior Budget with Gemini...</span>
                          </>
                        ) : (
                          <span>Generate Home Recommendations</span>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Sidebar guidance */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Allocation Ratios</span>
                  </h3>
                  <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                    <li><strong className="text-slate-200">50% Core Seating & Storage:</strong> Anchors the room function.</li>
                    <li><strong className="text-slate-200">15% Layered Warm Lighting:</strong> 3000K color tone harmony.</li>
                    <li><strong className="text-slate-200">15% Silent BLDC Fans:</strong> Cuts up to 65% power consumption.</li>
                    <li><strong className="text-slate-200">10% Acoustic Textiles:</strong> Softens echoes and adds warmth.</li>
                    <li><strong className="text-slate-200">10% Surplus Buffer:</strong> Covers delivery & hardware fittings.</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-2">Retailers Evaluated</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    IKEA, Amazon Home, Pepperfry, Philips Lighting, and Atomberg for certified energy ratings.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* 3. PARTY PLANNER TAB */}
        {activeTab === "party" && (
          !user ? (
            <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Login or Sign Up Required</h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                You must login or sign up first to access the Party & Event Planner.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-500 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Continue</span>
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Account</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAuthLoading(true);
                    try {
                      const res = await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: "alex.mercer@example.com", password: "SecurePassword123!" }),
                      });
                      const data = await res.json();
                      if (data.access_token) {
                        setToken(data.access_token);
                        setUser(data.user);
                        localStorage.setItem("pocketsmart_token", data.access_token);
                        localStorage.setItem("pocketsmart_user", JSON.stringify(data.user));
                      }
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-1 text-xs text-slate-400 hover:text-purple-300 transition-colors underline pt-2"
                >
                  ✨ Instant Access with Demo Account
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 p-7 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-white">Party & Event Budget Planner</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Optimize per-guest catering, private venue hire, thematic floral/balloon arches, and audio setups.
                  </p>
                </div>

                <form onSubmit={handlePartySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Total Budget ($)</label>
                      <input
                        type="number"
                        required
                        min={100}
                        step={50}
                        value={partyForm.total_budget}
                        onChange={(e) => setPartyForm({ ...partyForm, total_budget: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono tabular-nums focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Guest Count</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={1000}
                        value={partyForm.guest_count}
                        onChange={(e) => setPartyForm({ ...partyForm, guest_count: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono tabular-nums focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Type</label>
                    <select
                      value={partyForm.event_type}
                      onChange={(e) => setPartyForm({ ...partyForm, event_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="Birthday Party">Birthday Party</option>
                      <option value="Wedding Sangeet / Reception">Wedding Sangeet / Reception</option>
                      <option value="Corporate Mixer / Team Dinner">Corporate Mixer / Team Dinner</option>
                      <option value="Housewarming Celebration">Housewarming Celebration</option>
                      <option value="Anniversary Dinner">Anniversary Dinner</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Food & Beverages</label>
                      <input
                        type="text"
                        value={partyForm.food_requirements}
                        onChange={(e) => setPartyForm({ ...partyForm, food_requirements: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Venue Requirements</label>
                      <input
                        type="text"
                        value={partyForm.venue_requirements}
                        onChange={(e) => setPartyForm({ ...partyForm, venue_requirements: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Decoration</label>
                      <input
                        type="text"
                        value={partyForm.decoration_requirements}
                        onChange={(e) => setPartyForm({ ...partyForm, decoration_requirements: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Entertainment & Sound</label>
                      <input
                        type="text"
                        value={partyForm.entertainment_requirements}
                        onChange={(e) => setPartyForm({ ...partyForm, entertainment_requirements: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Free Trial Limit and Quota Indicator */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                      <span>Plan & Quota</span>
                      <span className={user.plan !== "pro" && (user.trials_used || 0) >= 3 ? "text-amber-400 font-bold" : "text-slate-300 font-medium"}>
                        {user.plan === "pro"
                          ? "⚡ Unlimited Generations (Pro Plan)"
                          : `⚡ Free Trial: ${user.trials_used || 0} of 3 used (${Math.max(0, 3 - (user.trials_used || 0))} remaining)`}
                      </span>
                    </div>

                    {user.plan !== "pro" && (user.trials_used || 0) >= 3 ? (
                      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                          <div>
                            <div className="font-bold text-white text-xs">Free trial limit reached (3/3 used)</div>
                            <div className="text-[11px] text-amber-300">You have completed your 3 free trials. Please upgrade your plan to continue.</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUpgradeModalOpen(true)}
                          className="px-4 py-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-lg shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Upgrade Plan</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>Optimizing Catering & Venue Ratios...</span>
                          </>
                        ) : (
                          <span>Generate Party Plan</span>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Sidebar guidance */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-2">Event Per-Head Benchmark</h3>
                  <div className="text-2xl font-bold font-mono text-purple-400 mb-2 tabular-nums">
                    {formatCurrency(partyForm.total_budget / Math.max(1, partyForm.guest_count))} / guest
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Includes full culinary spread, dedicated space reservation, thematic photo decor, and sound amplification.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-2">Suggested Platforms</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Swiggy Gourmet, Zomato Catering, OYO Townhouse, and Amazon Event Supplies.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* 4. JEWELRY PLANNER TAB */}
        {activeTab === "jewelry" && (
          !user ? (
            <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Login or Sign Up Required</h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                You must login or sign up first to access the Jewelry Styling Planner.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-pink-600 rounded-xl hover:bg-pink-500 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Continue</span>
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Account</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAuthLoading(true);
                    try {
                      const res = await fetch("/api/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: "alex.mercer@example.com", password: "SecurePassword123!" }),
                      });
                      const data = await res.json();
                      if (data.access_token) {
                        setToken(data.access_token);
                        setUser(data.user);
                        localStorage.setItem("pocketsmart_token", data.access_token);
                        localStorage.setItem("pocketsmart_user", JSON.stringify(data.user));
                      }
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-1 text-xs text-slate-400 hover:text-pink-300 transition-colors underline pt-2"
                >
                  ✨ Instant Access with Demo Account
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 p-7 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-white">Jewelry Styling Planner</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Find coordinated necklaces, earrings, and bangles matched to your dress neckline and occasion.
                  </p>
                </div>

                <form onSubmit={handleJewelrySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Jewelry Budget ($)</label>
                      <input
                        type="number"
                        required
                        min={50}
                        step={50}
                        value={jewelryForm.budget}
                        onChange={(e) => setJewelryForm({ ...jewelryForm, budget: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono tabular-nums focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Occasion</label>
                      <select
                        value={jewelryForm.occasion}
                        onChange={(e) => setJewelryForm({ ...jewelryForm, occasion: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        <option value="Wedding / Reception">Wedding / Reception</option>
                        <option value="Cocktail Evening / Gala">Cocktail Evening / Gala</option>
                        <option value="Festive Celebration">Festive Celebration</option>
                        <option value="Engagement Ceremony">Engagement Ceremony</option>
                        <option value="Daily Office Wear">Daily Office Wear</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Jewelry Category</label>
                      <select
                        value={jewelryForm.jewelry_type}
                        onChange={(e) => setJewelryForm({ ...jewelryForm, jewelry_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        <option value="Necklace & Earring Set">Necklace & Earring Set</option>
                        <option value="Choker & Studs">Choker & Studs</option>
                        <option value="Statement Earrings">Statement Earrings</option>
                        <option value="Bangles & Bracelets Stack">Bangles & Bracelets Stack</option>
                        <option value="Complete Bridal Suite">Complete Bridal Suite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Style</label>
                      <select
                        value={jewelryForm.preferred_style}
                        onChange={(e) => setJewelryForm({ ...jewelryForm, preferred_style: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        <option value="Contemporary Diamond">Contemporary Diamond</option>
                        <option value="Traditional Temple Gold">Traditional Temple Gold</option>
                        <option value="Kundan & Polki Royal">Kundan & Polki Royal</option>
                        <option value="Modern Minimalist">Modern Minimalist</option>
                        <option value="Boho Chic & Oxidised">Boho Chic & Oxidised</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Material & Finish</label>
                      <select
                        value={jewelryForm.material_preference}
                        onChange={(e) => setJewelryForm({ ...jewelryForm, material_preference: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        <option value="18K Rose Gold">18K Rose Gold</option>
                        <option value="925 Sterling Silver">925 Sterling Silver</option>
                        <option value="22K Yellow Gold">22K Yellow Gold</option>
                        <option value="Gold Plated Brass">Gold Plated Brass</option>
                        <option value="Oxidised Silver">Oxidised Silver</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Accent Stone Color</label>
                      <input
                        type="text"
                        placeholder="e.g. Emerald green, ruby, pearl"
                        value={jewelryForm.preferred_color}
                        onChange={(e) => setJewelryForm({ ...jewelryForm, preferred_color: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Outfit Description</label>
                    <input
                      type="text"
                      value={jewelryForm.outfit_description}
                      onChange={(e) => setJewelryForm({ ...jewelryForm, outfit_description: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>

                  {/* Multimodal Photo Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Upload Outfit Photo (Optional Multimodal AI)
                    </label>
                    {!outfitPreview ? (
                      <label className="border-2 border-dashed border-slate-800 hover:border-pink-500/50 rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer bg-slate-950/50 hover:bg-pink-950/10 transition-colors">
                        <Upload className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-xs font-medium text-slate-300">Click to upload dress or saree photo</span>
                        <span className="text-[11px] text-slate-500 mt-1">JPEG, PNG, WebP up to 5MB. Gemini inspects neckline & colors.</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    ) : (
                      <div className="relative inline-block border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                        <img src={outfitPreview} alt="Outfit Preview" className="h-40 w-auto object-cover" />
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1 rounded-full"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Free Trial Limit and Quota Indicator */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                      <span>Plan & Quota</span>
                      <span className={user.plan !== "pro" && (user.trials_used || 0) >= 3 ? "text-amber-400 font-bold" : "text-slate-300 font-medium"}>
                        {user.plan === "pro"
                          ? "⚡ Unlimited Generations (Pro Plan)"
                          : `⚡ Free Trial: ${user.trials_used || 0} of 3 used (${Math.max(0, 3 - (user.trials_used || 0))} remaining)`}
                      </span>
                    </div>

                    {user.plan !== "pro" && (user.trials_used || 0) >= 3 ? (
                      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                          <div>
                            <div className="font-bold text-white text-xs">Free trial limit reached (3/3 used)</div>
                            <div className="text-[11px] text-amber-300">You have completed your 3 free trials. Please upgrade your plan to continue.</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUpgradeModalOpen(true)}
                          className="px-4 py-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-lg shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Upgrade Plan</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 text-sm font-semibold text-white bg-pink-600 rounded-xl hover:bg-pink-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>Stylist Matching Neckline & Gemstones...</span>
                          </>
                        ) : (
                          <span>Curate Jewelry Collection</span>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Sidebar guidance */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-2">Multimodal Visual Analysis</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    When an image is provided, Gemini examines the fabric texture, neckline contour (deep V, square, sweetheart), and metallic embroidery to ensure harmonized aesthetics.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 mb-2">Certified Brands</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tanishq, CaratLane, BlueStone, GIVA, and Mia for hallmarked gold and certified lab/natural stones.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* 5. RECOMMENDATIONS TAB */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            {!currentRec ? (
              <div className="py-20 text-center">
                <p className="text-sm text-slate-400 mb-4">No recommendations to display.</p>
                <button
                  onClick={() => handleSelectTab("home")}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Create New Plan
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-xl font-bold text-white capitalize">
                        {currentRec.planner_type} Recommendation Plan
                      </h1>
                      {currentRec.is_fallback ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Algorithmic Fallback
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Gemini 3.8 Flash</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Curated item allocation based on your input parameters and current market norms.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Plan</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700"
                    >
                      Dashboard
                    </button>
                  </div>
                </div>

                {/* Budget Summary Card */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Budget</div>
                      <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                        {formatCurrency(currentRec.budget_summary.total_budget)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocated</div>
                      <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                        {formatCurrency(currentRec.budget_summary.allocated)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Surplus Margin</div>
                      <div className="text-xl font-bold font-mono text-slate-400 mt-1 tabular-nums">
                        {formatCurrency(currentRec.budget_summary.remaining)}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, currentRec.budget_summary.allocation_percentage || 0)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1.5 text-right tabular-nums font-mono">
                      {currentRec.budget_summary.allocation_percentage}% of total budget allocated
                    </div>
                  </div>
                </div>

                {/* Recommendation Item Cards */}
                <div>
                  <h2 className="text-base font-semibold text-slate-200 mb-3">Itemized Recommendations</h2>
                  <div className="space-y-3">
                    {currentRec.recommendations.map((item, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[11px] font-semibold tracking-wider uppercase text-indigo-400">
                              {item.category}
                            </span>
                            <h3 className="text-base font-semibold text-white mt-0.5">{item.name}</h3>
                          </div>
                          <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">
                            {formatCurrency(item.estimated_price)}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed mb-3">{item.description}</p>

                        <div className="text-xs text-slate-400 mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                          <strong className="text-slate-300">Why it matches: </strong>
                          {item.reason}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                          <span className="text-slate-400">
                            Suggested Platform: <strong className="text-slate-200">{item.platform}</strong>
                          </span>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(item.external_search_query || item.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                          >
                            <span>Search Marketplace</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Tips */}
                {currentRec.tips && currentRec.tips.length > 0 && (
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 mb-2">Actionable Budget & Styling Tips</h3>
                    <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                      {currentRec.tips.map((tip, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="text-xs text-slate-500 p-4 rounded-xl bg-slate-950 border border-slate-900 leading-relaxed">
                  {currentRec.disclaimer}
                </div>
              </>
            )}
          </div>
        )}

        {/* 6. HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white">Recommendation History</h1>
              <p className="text-xs text-slate-400 mt-1">
                Browse and reopen your previous budget optimization runs.
              </p>
            </div>

            {!user && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <span><strong>Guest Mode:</strong> Your recommendations are saved locally on this browser. You can view, open, and manage them anytime.</span>
                </div>
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                    setIsAuthModalOpen(true);
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 shrink-0 self-start sm:self-auto"
                >
                  Sign in to sync across devices →
                </button>
              </div>
            )}

            {historyList.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-sm text-slate-400 mb-4">You have no saved recommendations yet.</p>
                <button
                  onClick={() => handleSelectTab("home")}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Create Your First Plan
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-4">Planner</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Budget</th>
                      <th className="py-3 px-4">Suggestions</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white capitalize flex items-center gap-2">
                          {item.planner_type === "home" && <Home className="w-4 h-4 text-indigo-400" />}
                          {item.planner_type === "party" && <PartyPopper className="w-4 h-4 text-purple-400" />}
                          {item.planner_type === "jewelry" && <Sparkles className="w-4 h-4 text-pink-400" />}
                          <span>{item.planner_type}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200">
                          {formatCurrency(item.response_data?.budget)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {item.response_data?.recommendations?.length || 0} items
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => {
                                setCurrentRec(item.response_data);
                                setActiveTab("recommendations");
                              }}
                              className="px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 rounded-md hover:bg-indigo-900/80"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteHistory(item.id)}
                              className="px-3 py-1 text-xs font-medium text-red-400 bg-red-950/40 border border-red-900/40 rounded-md hover:bg-red-900/40"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-6 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>PocketSmart AI</strong> — Smart Budget & Recommendation Assistant
          </div>
          <div>
            <span>Powered by Google Gemini 3.8 Flash · Zero Unverified Markups</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal (Sign In / Register) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                {authMode === "login" ? "Sign In to PocketSmart AI" : "Create PocketSmart Account"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {authMode === "login"
                  ? "Access your saved budget plans and synchronized recommendation history."
                  : "Sign up to track, customize, and save smart recommendations."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  authMode === "login"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  authMode === "register"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Alex Mercer"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <span className="text-[11px] text-slate-500">Min 6 characters</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-sm"
              >
                {authLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>{authMode === "login" ? "Signing In..." : "Creating Account..."}</span>
                  </>
                ) : (
                  <span>{authMode === "login" ? "Sign In to Account" : "Register Account"}</span>
                )}
              </button>
            </form>

            {/* Demo Credentials Helper */}
            <div className="mt-5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                <span className="text-slate-200 font-medium">Quick Demo: </span>
                <span>alex.mercer@example.com</span>
              </div>
              <button
                type="button"
                onClick={autofillDemo}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 ml-2"
              >
                Autofill
              </button>
            </div>

            <div className="mt-5 text-center text-xs text-slate-400">
              {authMode === "login" ? (
                <span>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError(null);
                    }}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Sign up now
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError(null);
                    }}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsUpgradeModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Upgrade Your PocketSmart Plan</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                You've completed your 3 free trials. Upgrade your plan to continue generating AI budget recommendations.
              </p>
            </div>

            {upgradeSuccessMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{upgradeSuccessMsg}</span>
              </div>
            )}

            {/* Plan card */}
            <div className="p-5 rounded-xl bg-gradient-to-b from-indigo-950/40 to-slate-950 border-2 border-indigo-500/60 mb-5 relative">
              <span className="absolute -top-3 right-4 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 bg-indigo-600 rounded-full shadow-sm">
                Pro Unlimited
              </span>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>PocketSmart Pro</span>
                    <Crown className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400">Unlimited full-spectrum AI planning</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-white font-mono">$19</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>
              </div>

              <ul className="text-xs text-slate-300 space-y-2.5 border-t border-slate-800/80 pt-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited AI generations across Home, Party & Jewelry</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Powered by Google Gemini 3.8 Flash model</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multimodal outfit photo inspection & neckline pairing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Permanent cloud history & print budget sheets</span>
                </li>
              </ul>

              <button
                type="button"
                onClick={handleUpgradeToPro}
                disabled={upgradeLoading || user?.plan === "pro"}
                className="w-full mt-5 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {upgradeLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Activating Pro Plan...</span>
                  </>
                ) : user?.plan === "pro" ? (
                  <span>✅ Pro Plan Active (Unlimited)</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current text-amber-300" />
                    <span>Upgrade to Pro Now ($19/mo)</span>
                  </>
                )}
              </button>
            </div>

            {/* Free Trial Reset for Testing */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Need to test again?</span>
              <button
                type="button"
                onClick={handleResetTrials}
                disabled={upgradeLoading}
                className="font-semibold text-indigo-400 hover:text-indigo-300 underline"
              >
                Reset 3 Free Trials (Demo)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
