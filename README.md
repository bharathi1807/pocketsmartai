# PocketSmart AI: Your Smart Budget & Recommendation Assistant

PocketSmart AI is an end-to-end full-stack artificial intelligence application designed to intelligently allocate budgets and recommend curated purchases across three core lifestyle verticals:
1. **Home Interior Planning** (furniture, layered lighting, silent BLDC fans, dining sets, acoustic textiles)
2. **Party & Event Planning** (per-head catering, venue booking, thematic decor, sound/DJ systems, guest accommodation)
3. **Jewelry Styling & Recommendations** (precious metals, occasion styling, gemstones, with multimodal outfit image analysis)

---

## Architecture Overview

PocketSmart AI uses a clean, decoupled architecture:

```
[ Frontend (HTML5 / CSS3 / Vanilla JS) ]
                   │
                   ▼  REST API (JSON & Multipart)
     [ FastAPI Backend Service ]
          │              │
          ▼              ▼
   [ SQLite / Postgres ]  [ Service Layer ]
                          ├── Google Gemini API (gemini-3.8-flash)
                          └── Algorithmic Fallback Engine
```

- **Frontend**: Lightweight, responsive Vanilla HTML5/CSS3/JavaScript utilizing the Fetch API with zero third-party UI framework lock-in.
- **Backend**: FastAPI with asynchronous endpoints, Pydantic input/response validation, and automatic OpenAPI documentation (`/docs`).
- **Database**: SQLAlchemy ORM with SQLite for instant local zero-setup development, seamlessly configurable for PostgreSQL in production.
- **Security**: JWT bearer token authentication, bcrypt password hashing, and user-isolated database permissions.
- **AI Core**: Google Gemini (`gemini-3.8-flash`) providing structured JSON recommendations and multimodal image parsing.
- **Resilience**: An algorithmic fallback engine guarantees zero crashes if external AI services are unreachable, unconfigured, or rate-limited.

---

## Project Structure

```
PocketSmart-AI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── dependencies.py
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── home.py
│   │   │   ├── party.py
│   │   │   ├── jewelry.py
│   │   │   └── recommendation.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── home.py
│   │   │   ├── party.py
│   │   │   ├── jewelry.py
│   │   │   ├── recommendations.py
│   │   │   └── history.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── gemini_service.py
│   │   │   ├── recommendation_service.py
│   │   │   └── fallback_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── validators.py
│   ├── uploads/
│   │   └── .gitkeep
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── home-planner.html
│   ├── party-planner.html
│   ├── jewelry-planner.html
│   ├── recommendations.html
│   ├── history.html
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   └── planner.css
│   ├── js/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── home-planner.js
│   │   ├── party-planner.js
│   │   ├── jewelry-planner.js
│   │   ├── recommendations.js
│   │   └── history.js
│   └── assets/
│       └── images/
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: (optional, for local static serving via Vite/Live Server or full-stack proxy)
- **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

---

## Backend Installation & Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate       # On macOS/Linux
   # or
   .\venv\Scripts\activate        # On Windows Command Prompt/PowerShell
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure your keys:
   ```env
   SECRET_KEY="your-random-32-character-secret-key-here"
   GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
   DATABASE_URL="sqlite:///./pocketsmart.db"
   CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500"
   ```

5. **Start the FastAPI backend with Uvicorn**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API is accessible at:
   - Root: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

---

## Frontend Installation & Setup

The frontend consists of static HTML, CSS, and vanilla JS. It can be served with any static web server:

1. **Option A: VS Code Live Server Extension**
   - Open the `frontend` folder in VS Code.
   - Right-click `index.html` and select **"Open with Live Server"** (default port `5500`).

2. **Option B: Python HTTP Server**
   ```bash
   cd frontend
   python3 -m http.server 3000
   ```
   Open `http://localhost:3000` in your browser.

3. **Option C: Node.js / Vite**
   From the project root:
   ```bash
   npm run dev
   ```

---

## API Endpoints Reference

### Authentication & Session
- `POST /api/auth/register` — Create user account with name, email, password. Returns JWT token.
- `POST /api/auth/login` — Authenticate credentials. Returns JWT token.
- `POST /api/auth/logout` — Invalidate user session.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `GET /api/session-info` — Check server status, authentication, and Gemini readiness.
- `GET /api/session-data` — Lightweight session metadata.

### Planners
- `POST /api/planners/home` — Generate interior furniture & lighting recommendations.
- `POST /api/planners/party` — Generate catering, venue, decor, and entertainment budget allocation.
- `POST /api/planners/jewelry` — Generate jewelry recommendations with optional multipart outfit image.

### Recommendation History
- `GET /api/history` — List all recommendation sessions belonging to the authenticated user.
- `GET /api/history/{id}` — Fetch full detail for a specific recommendation session.
- `DELETE /api/history/{id}` — Delete a recommendation session.

---

## Running the Automated Test Suite

The test suite validates authentication, user isolation, planners, image file constraints, and fallback logic without requiring a live Gemini connection:

```bash
cd backend
pytest tests/ -v
```

---

## Deploying to Production

### 1. Backend Deployment (Render, Railway, or Google Cloud Run)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `DATABASE_URL`: Your production PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname`)
  - `GEMINI_API_KEY`: Google Gemini API key
  - `SECRET_KEY`: A secure 32+ character random string
  - `CORS_ORIGINS`: Deployed frontend domain (e.g. `https://pocketsmart-app.vercel.app`)

### 2. Frontend Deployment (Vercel, Netlify, or GitHub Pages)
- Upload the `frontend/` directory.
- Update `frontend/js/config.js` to point `API_BASE_URL` to your live backend domain or set `window.__POCKETSMART_API_URL__`.

---

## Security Notes
- Plain-text passwords are never stored; all passwords are hashed using bcrypt.
- Passwords and secret keys are never included in API responses or logs.
- Gemini API keys are strictly confined to the backend service and never exposed to client-side scripts.
- Uploaded outfit images are strictly restricted to JPEG, PNG, and WebP, capped at 5MB, and stored with cryptographically secure UUID filenames.
- Multi-tenant data isolation ensures users cannot inspect or mutate other users' recommendation history.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
