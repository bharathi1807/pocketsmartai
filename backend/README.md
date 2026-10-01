# PocketSmart AI — Backend API Service

FastAPI backend service powering the PocketSmart AI budget planning and recommendation platform.

## Features
- **FastAPI**: Asynchronous high-performance REST API with automated OpenAPI / Swagger documentation (`/docs`, `/redoc`).
- **SQLAlchemy & Database**: Dual compatibility with SQLite for zero-config local development and PostgreSQL for production.
- **JWT & Password Security**: Industry-standard bcrypt password hashing and HMAC-SHA256 JWT bearer token authentication.
- **Google Gemini AI**: Integration with `gemini-3.8-flash` for budget optimization and multimodal outfit image styling.
- **Fail-Safe Fallback**: Algorithmic budget distribution engine guarantees zero crashes if AI quotas are exceeded or offline.
- **Secure File Handling**: Safe UUID-based image upload pipeline with MIME-type and size guards.
- **User Data Isolation**: Role & ownership verification ensures users only view their own recommendation history.

## Quick Start (Local Development)

### 1. Create and Activate Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env` and set your Google Gemini API key:
```bash
cp .env.example .env
```
Edit `.env`:
```env
GEMINI_API_KEY="AIzaSy..."
DATABASE_URL="sqlite:///./pocketsmart.db"
SECRET_KEY="super-secret-production-key-at-least-32-characters"
```

### 4. Run Server
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API docs will be live at: `http://localhost:8000/docs`

### 5. Run Test Suite
```bash
pytest tests/ -v
```

## Production Deployment (e.g. Render / Railway / Cloud Run)
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set `DATABASE_URL` to your production PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname`).
- Set `GEMINI_API_KEY`, `SECRET_KEY`, and `CORS_ORIGINS`.
