import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup file uploads
const uploadDir = path.resolve(process.cwd(), "backend", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// In-memory persistent datastore for development session
interface UserRecord {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  trials_used: number;
  plan: "free" | "pro";
}

interface HistoryRecord {
  id: number;
  user_id: number;
  planner_type: string;
  request_data: any;
  response_data: any;
  created_at: string;
}

const users: UserRecord[] = [
  {
    id: 1,
    name: "Alex Mercer",
    email: "alex.mercer@example.com",
    password_hash: hashPassword("SecurePassword123!"),
    created_at: new Date().toISOString(),
    trials_used: 0,
    plan: "free",
  },
];

const historyStore: HistoryRecord[] = [];
let nextUserId = 2;
let nextHistoryId = 1;

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "pocketsmart_salt").digest("hex");
}

function generateToken(user: UserRecord): string {
  const payload = {
    sub: user.email,
    id: user.id,
    name: user.name,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function verifyToken(authHeader?: string): UserRecord | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const payload = JSON.parse(raw);
    if (payload.exp && payload.exp < Date.now()) return null;
    return users.find((u) => u.email === payload.sub) || null;
  } catch {
    return null;
  }
}

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Gemini initialization error:", err);
  }
}

// Fallback recommendation generators
function generateHomeFallback(req: any) {
  const budget = Number(req.total_budget) || 50000;
  const style = req.style_preference || "Modern Minimalist";
  const room = req.room_type || "Living Room";

  const furnitureBudget = Math.round(budget * 0.52);
  const lightingBudget = Math.round(budget * 0.16);
  const ventilationBudget = Math.round(budget * 0.14);
  const decorBudget = Math.round(budget * 0.10);
  const allocated = furnitureBudget + lightingBudget + ventilationBudget + decorBudget;
  const remaining = Math.max(0, budget - allocated);

  return {
    planner_type: "home",
    budget,
    budget_summary: {
      total_budget: budget,
      allocated,
      remaining,
      allocation_percentage: Math.round((allocated / budget) * 100),
    },
    recommendations: [
      {
        category: "Furniture",
        name: `${style} Primary Seating & Modular Storage`,
        description: `Ergonomic seating layout tailored for ${room} in durable fabric with solid hardwood framing. ${req.furniture_requirements || ""}`,
        estimated_price: furnitureBudget,
        platform: "IKEA / Pepperfry",
        reason: `Maximizes utility and traffic flow for ${room} dimensions.`,
        external_search_query: `${style} ${room} furniture set`,
      },
      {
        category: "Lighting",
        name: "Warm 3000K Diffused Ambient & Accent Spotlight Kit",
        description: `Dimmable LED track lighting system and floor lamp. ${req.lighting_requirements || ""}`,
        estimated_price: lightingBudget,
        platform: "Philips Lighting / Amazon",
        reason: "Produces layered glare-free illumination suitable for evening relaxation.",
        external_search_query: `dimmable warm ambient lighting ${style}`,
      },
      {
        category: "Ventilation & Fixtures",
        name: "Silent BLDC Aerodynamic Ceiling Fan",
        description: `Brushless DC motor ceiling fan with remote speed control. ${req.ceiling_fan_requirements || ""}`,
        estimated_price: ventilationBudget,
        platform: "Atomberg / Amazon",
        reason: "Saves up to 65% electricity compared to conventional induction fans.",
        external_search_query: "bldc silent ceiling fan wooden blades",
      },
      {
        category: "Decor & Textiles",
        name: "Textured Neutral Area Rug & Acoustic Linen Curtains",
        description: `High-density stain-resistant rug and thermal insulating drapes. ${req.other_requirements || ""}`,
        estimated_price: decorBudget,
        platform: "Home Centre / Amazon",
        reason: "Absorbs ambient room reverberation and establishes visual warmth.",
        external_search_query: `neutral area rug linen curtains ${style}`,
      },
    ],
    tips: [
      "Order anchor furniture first before locking in accent rugs or wall decor.",
      "Check door frame dimensions to verify large furniture pieces fit during delivery.",
      "Keep 2700K–3000K bulbs consistent across all room fixtures for color harmony.",
      `Reserve the remaining $${remaining} for delivery fees and unforeseen assembly hardware.`,
    ],
    is_fallback: true,
    disclaimer:
      "[Local Fallback Engine] Recommendations generated via algorithmic budget distribution. Platform names are suggested search targets.",
  };
}

function generatePartyFallback(req: any) {
  const budget = Number(req.total_budget) || 35000;
  const guestCount = Math.max(1, Number(req.guest_count) || 20);
  const eventType = req.event_type || "Birthday Celebration";

  const foodBudget = Math.round(budget * 0.44);
  const venueBudget = Math.round(budget * 0.28);
  const decorBudget = Math.round(budget * 0.14);
  const entBudget = Math.round(budget * 0.10);
  const allocated = foodBudget + venueBudget + decorBudget + entBudget;
  const remaining = Math.max(0, budget - allocated);

  return {
    planner_type: "party",
    budget,
    budget_summary: {
      total_budget: budget,
      allocated,
      remaining,
      allocation_percentage: Math.round((allocated / budget) * 100),
    },
    recommendations: [
      {
        category: "Catering & Beverages",
        name: `Curated Buffet & Mocktail Package (${guestCount} guests)`,
        description: `Welcome drinks, 3 appetizers, 2 mains, breads, and dessert. ${req.food_requirements || ""}`,
        estimated_price: foodBudget,
        platform: "Swiggy Gourmet / Local Caterer",
        reason: `Guarantees generous food portions at ~$${Math.round(foodBudget / guestCount)} per guest.`,
        external_search_query: `catering service ${eventType} for ${guestCount} guests`,
      },
      {
        category: "Venue Rental",
        name: `Private Event Venue Booking (${eventType})`,
        description: `Dedicated party space with climate control, seating, and restrooms. ${req.venue_requirements || ""}`,
        estimated_price: venueBudget,
        platform: "OYO Townhouse / Local Banquet",
        reason: "Prevents noise complaints and comfortably accommodates guest capacity.",
        external_search_query: `venue rental ${eventType} ${guestCount} people`,
      },
      {
        category: "Decor & Backdrops",
        name: "Thematic Balloon Arch, Fairy Lights & Photo Backdrop",
        description: `Customized stage/entry decor package. ${req.decoration_requirements || ""}`,
        estimated_price: decorBudget,
        platform: "Amazon Event Supplies / Local Decorator",
        reason: "Creates striking visual focal points for guest photos.",
        external_search_query: `thematic party decoration package ${eventType}`,
      },
      {
        category: "Sound & Entertainment",
        name: "Wireless Sound System, Microphone & DJ Playlist Kit",
        description: `High-clarity PA audio setup with wireless mics. ${req.entertainment_requirements || ""}`,
        estimated_price: entBudget,
        platform: "Local AV Sound Rental",
        reason: "Ensures toasts, speeches, and party music are crisp across the entire room.",
        external_search_query: "party audio sound system rental",
      },
    ],
    tips: [
      "Finalize dietary requirements (vegetarian, allergies) with your caterer 48 hours prior.",
      "Check if venue rental includes dedicated parking attendants and trash cleanup.",
      `Surplus of $${remaining} reserved for extra ice, venue overtime, or disposable supplies.`,
    ],
    is_fallback: true,
    disclaimer:
      "[Local Fallback Engine] Recommendations generated via event ratio benchmarks. Platform suggestions are search examples.",
  };
}

function generateJewelryFallback(req: any) {
  const budget = Number(req.budget) || 15000;
  const material = req.material_preference || "18K Rose Gold";
  const jewelryType = req.jewelry_type || "Necklace & Earring Set";
  const style = req.preferred_style || "Contemporary Diamond";
  const occasion = req.occasion || "Wedding";

  const primaryBudget = Math.round(budget * 0.65);
  const secondaryBudget = Math.round(budget * 0.25);
  const careBudget = Math.round(budget * 0.05);
  const allocated = primaryBudget + secondaryBudget + careBudget;
  const remaining = Math.max(0, budget - allocated);

  return {
    planner_type: "jewelry",
    budget,
    budget_summary: {
      total_budget: budget,
      allocated,
      remaining,
      allocation_percentage: Math.round((allocated / budget) * 100),
    },
    recommendations: [
      {
        category: "Primary Statement Piece",
        name: `${material} ${jewelryType} (${style})`,
        description: `Centerpiece suite crafted in ${material} with subtle stone accents, tailored for ${occasion}. ${req.outfit_description ? `Coordinates with ${req.outfit_description}.` : ""}`,
        estimated_price: primaryBudget,
        platform: "Tanishq / CaratLane / GIVA",
        reason: "Harmonizes with neckline geometry and grounds the occasion styling.",
        external_search_query: `${material} ${jewelryType} ${style}`,
      },
      {
        category: "Coordinating Accent",
        name: `Matching Studs / Delicate Tennis Bracelet`,
        description: `Complementary companion piece in ${material} echoing the primary motif.`,
        estimated_price: secondaryBudget,
        platform: "BlueStone / Mia by Tanishq",
        reason: "Provides balanced symmetry without visually overcrowding the collarbone.",
        external_search_query: `matching ${material} earrings ${style}`,
      },
      {
        category: "Care & Anti-Tarnish Storage",
        name: "Lined Velvet Jewelry Travel Organizer & Polishing Cloth",
        description: "Anti-oxidation zip case preventing atmospheric moisture and sulfur tarnishing.",
        estimated_price: careBudget,
        platform: "Amazon Fashion",
        reason: "Protects gemstone prong settings and preserves surface luster long term.",
        external_search_query: "anti tarnish velvet jewelry organizer",
      },
    ],
    tips: [
      "Always inspect hallmark stamps and certificate cards when purchasing precious metals.",
      "Spray perfumes and cosmetics before putting on fine jewelry to avoid chemical clouding.",
      `Surplus balance of $${remaining} can be applied toward customized chain length adjustments.`,
    ],
    is_fallback: true,
    disclaimer:
      "[Local Fallback Engine] Curated styling recommendations. Platform suggestions are search examples.",
  };
}

// ----------------- API ROUTES ----------------- //

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    app: "PocketSmart AI",
    gemini_configured: Boolean(aiClient),
  });
});

// Session Info
app.get("/api/session-info", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  res.json({
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
          trials_used: user.trials_used || 0,
          plan: user.plan || "free",
          max_trials: 3,
        }
      : null,
    app_name: "PocketSmart AI",
    environment: process.env.NODE_ENV || "development",
    gemini_configured: Boolean(aiClient),
  });
});

app.get("/api/session-data", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  res.json({
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          trials_used: user.trials_used || 0,
          plan: user.plan || "free",
          max_trials: 3,
        }
      : null,
    capabilities: {
      home_planner: true,
      party_planner: true,
      jewelry_planner: true,
      image_analysis: true,
      gemini_active: Boolean(aiClient),
    },
  });
});

// Auth Register
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ detail: "Name, email, and password are required." });
  }
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ detail: "An account with this email address already exists." });
  }

  const newUser: UserRecord = {
    id: nextUserId++,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: hashPassword(password),
    created_at: new Date().toISOString(),
    trials_used: 0,
    plan: "free",
  };
  users.push(newUser);

  const token = generateToken(newUser);
  res.status(201).json({
    access_token: token,
    token_type: "Bearer",
    expires_in_minutes: 1440,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      created_at: newUser.created_at,
      trials_used: 0,
      plan: "free",
      max_trials: 3,
    },
  });
});

// Auth Login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required." });
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ detail: "Invalid email or password credentials." });
  }

  const token = generateToken(user);
  res.json({
    access_token: token,
    token_type: "Bearer",
    expires_in_minutes: 1440,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      trials_used: user.trials_used || 0,
      plan: user.plan || "free",
      max_trials: 3,
    },
  });
});

// Auth Logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
});

// Auth Me
app.get("/api/auth/me", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ detail: "Authentication token is required." });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
    trials_used: user.trials_used || 0,
    plan: user.plan || "free",
    max_trials: 3,
  });
});

// Upgrade Plan to Pro
app.post("/api/user/upgrade", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ detail: "Authentication required to upgrade." });
  }
  user.plan = "pro";
  res.json({
    message: "Successfully upgraded to PocketSmart Pro! Enjoy unlimited generations.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      trials_used: user.trials_used || 0,
      plan: "pro",
      max_trials: 3,
    },
  });
});

// Reset Trials (for testing and trial refresh)
app.post("/api/user/reset-trials", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ detail: "Authentication required." });
  }
  user.trials_used = 0;
  user.plan = "free";
  res.json({
    message: "Free trials reset successfully (0 of 3 used).",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      trials_used: 0,
      plan: "free",
      max_trials: 3,
    },
  });
});

// Home Interior Planner
app.post("/api/planners/home", async (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({
      detail: "Authentication required. Please log in or sign up first to access the Home Interior Planner.",
      auth_required: true,
    });
  }

  if (user.plan !== "pro" && (user.trials_used || 0) >= 3) {
    return res.status(403).json({
      detail: "Free trial limit reached (3/3 used). Please upgrade your plan to continue.",
      trial_exceeded: true,
      trials_used: user.trials_used || 3,
      max_trials: 3,
      plan: user.plan || "free",
    });
  }

  const { total_budget, room_type, style_preference } = req.body;

  if (!total_budget || Number(total_budget) <= 0) {
    return res.status(400).json({ detail: "Budget must be greater than zero." });
  }

  let resultData: any = null;

  if (aiClient) {
    try {
      const prompt = `
You are an expert interior designer and budget estimator.
The user wants to plan interior purchases for their home with these specifications:
- Total Budget: $${total_budget}
- Room Type: ${room_type || "Living Room"}
- Room Quantity: ${req.body.room_quantity || 1}
- Style: ${style_preference || "Modern"}
- Furniture Requirements: ${req.body.furniture_requirements || "Essential stylish furniture"}
- Lighting Requirements: ${req.body.lighting_requirements || "Layered ambient and accent"}
- Ventilation: ${req.body.ceiling_fan_requirements || "Silent BLDC fan"}
- Dining Table: ${req.body.dining_table_requirements || "Compatible size"}
- Other Requirements: ${req.body.other_requirements || "Rugs, curtains, planters"}

Distribute the budget intelligently across Furniture, Lighting, Ventilation/Fixtures, and Decor.
External platforms: IKEA, Amazon Home, Pepperfry, Philips Lighting.

Return ONLY a valid JSON object matching this schema:
{
  "planner_type": "home",
  "budget": ${Number(total_budget)},
  "budget_summary": {
    "total_budget": ${Number(total_budget)},
    "allocated": 48000,
    "remaining": 2000,
    "allocation_percentage": 96
  },
  "recommendations": [
    {
      "category": "Furniture",
      "name": "Specific item name",
      "description": "Specific details and materials",
      "estimated_price": 25000,
      "platform": "IKEA",
      "reason": "Why this fits the user's request and budget",
      "external_search_query": "search query"
    }
  ],
  "tips": [
    "Practical actionable tip 1",
    "Practical actionable tip 2"
  ]
}
`;
      const response = await aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        parsed.is_fallback = false;
        parsed.disclaimer =
          "AI-generated recommendation powered by Google Gemini 3.8 Flash. Platform names are suggested search targets.";
        resultData = parsed;
      }
    } catch (err) {
      console.warn("Gemini Home Planner error, using fallback:", err);
    }
  }

  if (!resultData) {
    resultData = generateHomeFallback(req.body);
  }

  if (user) {
    if (user.plan !== "pro") {
      user.trials_used = (user.trials_used || 0) + 1;
    }
    resultData.trials_used = user.trials_used || 0;
    resultData.max_trials = 3;
    resultData.plan = user.plan || "free";

    historyStore.push({
      id: nextHistoryId++,
      user_id: user.id,
      planner_type: "home",
      request_data: req.body,
      response_data: resultData,
      created_at: new Date().toISOString(),
    });
  }

  res.json(resultData);
});

// Party Planner
app.post("/api/planners/party", async (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({
      detail: "Authentication required. Please log in or sign up first to access the Party Planner.",
      auth_required: true,
    });
  }

  if (user.plan !== "pro" && (user.trials_used || 0) >= 3) {
    return res.status(403).json({
      detail: "Free trial limit reached (3/3 used). Please upgrade your plan to continue.",
      trial_exceeded: true,
      trials_used: user.trials_used || 3,
      max_trials: 3,
      plan: user.plan || "free",
    });
  }

  const { total_budget, guest_count, event_type } = req.body;

  if (!total_budget || Number(total_budget) <= 0) {
    return res.status(400).json({ detail: "Budget must be greater than zero." });
  }
  if (!guest_count || Number(guest_count) < 1) {
    return res.status(400).json({ detail: "Guest count must be at least 1 person." });
  }

  let resultData: any = null;

  if (aiClient) {
    try {
      const prompt = `
You are a premier event planner and budget coordinator.
The user wants to organize an event with these parameters:
- Total Budget: $${total_budget}
- Guest Count: ${guest_count} guests
- Event Type: ${event_type || "Birthday Party"}
- Venue Requirements: ${req.body.venue_requirements || "Comfortable space"}
- Food Requirements: ${req.body.food_requirements || "Appetizers, buffet mains, desserts"}
- Decor: ${req.body.decoration_requirements || "Backdrop, balloons, lights"}
- Entertainment: ${req.body.entertainment_requirements || "Sound system, party playlist"}
- Accommodation: ${req.body.accommodation_requirements || "None"}

Divide the budget logically across Catering, Venue, Decor, and Entertainment.
Platforms: Swiggy Gourmet, Zomato Catering, OYO, Local Banquet, Amazon Supplies.

Return ONLY a valid JSON object matching this schema:
{
  "planner_type": "party",
  "budget": ${Number(total_budget)},
  "budget_summary": {
    "total_budget": ${Number(total_budget)},
    "allocated": 32000,
    "remaining": 3000,
    "allocation_percentage": 91
  },
  "recommendations": [
    {
      "category": "Catering & Food",
      "name": "Specific item or catering package",
      "description": "Details for ${guest_count} pax",
      "estimated_price": 18000,
      "platform": "Swiggy Gourmet",
      "reason": "Fits the per-head catering ratio",
      "external_search_query": "catering for ${guest_count} people"
    }
  ],
  "tips": [
    "Dietary check and timeline tip",
    "Venue contract tip"
  ]
}
`;
      const response = await aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        parsed.is_fallback = false;
        parsed.disclaimer =
          "AI-generated recommendation powered by Google Gemini 3.8 Flash. Platform names are suggested search targets.";
        resultData = parsed;
      }
    } catch (err) {
      console.warn("Gemini Party Planner error, using fallback:", err);
    }
  }

  if (!resultData) {
    resultData = generatePartyFallback(req.body);
  }

  if (user) {
    if (user.plan !== "pro") {
      user.trials_used = (user.trials_used || 0) + 1;
    }
    resultData.trials_used = user.trials_used || 0;
    resultData.max_trials = 3;
    resultData.plan = user.plan || "free";

    historyStore.push({
      id: nextHistoryId++,
      user_id: user.id,
      planner_type: "party",
      request_data: req.body,
      response_data: resultData,
      created_at: new Date().toISOString(),
    });
  }

  res.json(resultData);
});

// Jewelry Planner (with optional file upload)
app.post("/api/planners/jewelry", upload.single("image"), async (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({
      detail: "Authentication required. Please log in or sign up first to access the Jewelry Styling Planner.",
      auth_required: true,
    });
  }

  if (user.plan !== "pro" && (user.trials_used || 0) >= 3) {
    return res.status(403).json({
      detail: "Free trial limit reached (3/3 used). Please upgrade your plan to continue.",
      trial_exceeded: true,
      trials_used: user.trials_used || 3,
      max_trials: 3,
      plan: user.plan || "free",
    });
  }

  const body = req.body;
  const file = req.file;

  const budget = Number(body.budget);
  if (!budget || budget <= 0) {
    return res.status(400).json({ detail: "Budget must be greater than zero." });
  }

  let resultData: any = null;

  if (aiClient) {
    try {
      const parts: any[] = [];

      if (file) {
        const fileBytes = fs.readFileSync(file.path);
        parts.push({
          inlineData: {
            mimeType: file.mimetype || "image/jpeg",
            data: fileBytes.toString("base64"),
          },
        });
      }

      const promptText = `
You are a luxury jewelry stylist and gemologist.
The user wants jewelry recommendations matching these requirements:
- Budget: $${budget}
- Occasion: ${body.occasion || "Wedding"}
- Jewelry Type: ${body.jewelry_type || "Necklace Set"}
- Preferred Style: ${body.preferred_style || "Contemporary"}
- Accent Color: ${body.preferred_color || "Harmonizing tone"}
- Material: ${body.material_preference || "18K Rose Gold"}
- Outfit Description: ${body.outfit_description || "Special occasion attire"}
${file ? "An outfit photo is attached. Analyze the dress neckline, color palette, fabric texture, and embroidery to suggest jewelry that elevates the look." : ""}

Divide the budget across Primary Statement Jewel, Coordinating Accents, and Care/Storage.
Platforms: Tanishq, CaratLane, GIVA, BlueStone, Amazon Fashion.

Return ONLY a valid JSON object matching this schema:
{
  "planner_type": "jewelry",
  "budget": ${budget},
  "budget_summary": {
    "total_budget": ${budget},
    "allocated": 14000,
    "remaining": 1000,
    "allocation_percentage": 93
  },
  "recommendations": [
    {
      "category": "Primary Jewel",
      "name": "Jewelry piece title",
      "description": "Materials and styling details",
      "estimated_price": 10000,
      "platform": "Tanishq",
      "reason": "Why it harmonizes with the neckline",
      "external_search_query": "search query"
    }
  ],
  "tips": [
    "Maintenance or styling advice",
    "Neckline harmonization tip"
  ]
}
`;
      parts.push({ text: promptText });

      const response = await aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        parsed.is_fallback = false;
        parsed.disclaimer =
          "AI-generated recommendation powered by Google Gemini 3.8 Flash. Platform names are suggested search targets.";
        resultData = parsed;
      }
    } catch (err) {
      console.warn("Gemini Jewelry Planner error, using fallback:", err);
    }
  }

  if (!resultData) {
    resultData = generateJewelryFallback(body);
  }

  if (user) {
    if (user.plan !== "pro") {
      user.trials_used = (user.trials_used || 0) + 1;
    }
    resultData.trials_used = user.trials_used || 0;
    resultData.max_trials = 3;
    resultData.plan = user.plan || "free";

    historyStore.push({
      id: nextHistoryId++,
      user_id: user.id,
      planner_type: "jewelry",
      request_data: { ...body, has_image: Boolean(file) },
      response_data: resultData,
      created_at: new Date().toISOString(),
    });
  }

  res.json(resultData);
});

// Recommendation History List
app.get("/api/history", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ detail: "Authentication required to view history." });
  }

  const userItems = historyStore
    .filter((h) => h.user_id === user.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ total_count: userItems.length, items: userItems });
});

// History Item Detail
app.get("/api/history/:id", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ detail: "Authentication required." });
  }

  const item = historyStore.find((h) => h.id === Number(req.params.id));
  if (!item) {
    return res.status(404).json({ detail: "History record not found." });
  }
  if (item.user_id !== user.id) {
    return res.status(403).json({ detail: "Forbidden: You cannot access another user's history." });
  }

  res.json(item);
});

// History Item Delete
app.delete("/api/history/:id", (req: Request, res: Response) => {
  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ detail: "Authentication required." });
  }

  const idx = historyStore.findIndex((h) => h.id === Number(req.params.id));
  if (idx === -1) {
    return res.status(404).json({ detail: "History record not found." });
  }
  if (historyStore[idx].user_id !== user.id) {
    return res.status(403).json({ detail: "Forbidden." });
  }

  historyStore.splice(idx, 1);
  res.json({ message: "History record deleted successfully." });
});

// Serve frontend directory statically for direct access
app.use("/vanilla", express.static(path.resolve(process.cwd(), "frontend")));

// Mount Vite in development mode for root React UI
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PocketSmart AI Full-Stack Server running at http://localhost:${PORT}`);
    console.log(`- Interactive SPA: http://localhost:${PORT}/`);
    console.log(`- Vanilla Multi-Page Frontend: http://localhost:${PORT}/vanilla/index.html`);
    console.log(`- Health Check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
