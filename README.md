# 🎵 Vibes in the City

> Discover nightlife, restaurants and events in Tbilisi, Georgia.

A full-stack mobile app prototype — single-file frontend + Node.js REST API backend.

---

## 📱 Live Demo

Open `frontend/index.html` in any browser — works without a backend.

---

## 🗂 Project Structure

```
vibes-in-the-city/
├── frontend/
│   └── index.html          ← Full app (single file, works standalone)
├── backend/
│   ├── src/
│   │   ├── app.js          ← Express server + Socket.io
│   │   ├── config/
│   │   │   ├── database.js ← PostgreSQL pool
│   │   │   └── migrate.js  ← DB schema migration
│   │   ├── middleware/
│   │   │   ├── auth.js     ← JWT auth, roles
│   │   │   ├── errorHandler.js
│   │   │   └── upload.js   ← File uploads
│   │   └── routes/
│   │       ├── auth.js     ← Register, login, profile
│   │       ├── venues.js   ← Venues CRUD + geo search
│   │       ├── crud.js     ← Events, Bookings, Reviews, Messages, Managers
│   │       ├── maps.js     ← Geocoding, routing, nearby
│   │       └── ai.js       ← Claude AI proxy
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## ✨ Features

### Frontend (index.html)
| Feature | Status |
|---------|--------|
| 🗺️ Interactive map (Leaflet + OpenStreetMap/MapTiler) | ✅ |
| 🧭 Navigation — walk & drive (OSRM routing) | ✅ |
| 🛰️ Map / Satellite toggle | ✅ |
| 📍 Venue pins with live indicators | ✅ |
| 🔍 Live search with dropdown | ✅ |
| 📅 Events — Tonight's Vibes | ✅ |
| ❤️ Saved Places | ✅ |
| 🎯 Table booking with floor plan | ✅ |
| 👤 User profile | ✅ |
| 💼 Business Cabinet (12 screens) | ✅ |
| 🤖 AI Chat — Vibes AI (Claude) | ✅ |
| ✨ AI Promo Content — TikTok/Instagram/Facebook | ✅ |
| 📣 AI Description Improvement | ✅ |

### Backend API
| Module | Endpoints |
|--------|-----------|
| Auth | Register, Login, Refresh, Profile |
| Venues | CRUD, Geo search, Favorites |
| Events | CRUD, Tonight's Vibes feed |
| Bookings | Create, Confirm/Decline, History |
| Reviews | Submit, Reply, Rating stats |
| Messages | Conversations, Real-time (WebSocket) |
| Managers | CRUD |
| Maps | Geocoding, Routing, Nearby |
| AI | Promo generator, Chat, Description |
| Upload | Photos & video |

---

## 🚀 Quick Start

### Frontend (no backend needed)

Just open in browser:
```bash
open frontend/index.html
```

For AI features — the app calls Anthropic API directly from the browser.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add DATABASE_URL and ANTHROPIC_API_KEY

# Create PostgreSQL database
createdb vibes_db

# Run migration (creates all tables)
npm run db:migrate

# Start server
npm run dev
```

---

## 🗺️ Maps Setup

The app uses **free maps** — no credit card required:

| Service | Used for | Cost |
|---------|----------|------|
| OpenStreetMap + Leaflet | Map display (default) | **Free forever** |
| MapTiler | Better looking tiles (optional) | **Free** 100k/month |
| OSRM | Walk + drive routing | **Free** public server |
| Nominatim | Geocoding (address search) | **Free** |
| PostGIS | Nearby venues query | **Free** |

**Optional: Better map tiles with MapTiler**
1. Sign up free at [cloud.maptiler.com](https://cloud.maptiler.com)
2. Copy your API key
3. In `frontend/index.html`, find `window.MAPTILER_KEY = ''` and paste your key
4. Or set `MAPTILER_KEY=yourkey` in backend `.env`

---

## 🧭 Navigation

Navigation is built into the map. From any venue:
1. Tap **"Find the Way"**
2. Choose 🚶 Walk or 🚗 Drive
3. See route on map + turn-by-turn steps + ETA
4. Tap **"Open in Google Maps"** for real GPS navigation

---

## 🤖 AI Features

Uses **Anthropic Claude** API:
- **Vibes AI Chat** — ask for venue/event recommendations
- **Add Event → Generate Promo** — TikTok, Instagram, Facebook posts
- **Improve Description** — AI rewrites event descriptions

Set your API key in backend `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🌍 Deploy

### GitHub Pages (frontend only)
1. Push to GitHub
2. Settings → Pages → Branch: main → `/frontend`
3. Access at `https://username.github.io/vibes-in-the-city`

### Railway (backend)
```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway add postgresql
railway up
```

### Render (backend)
1. Connect GitHub repo
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add PostgreSQL database
6. Set environment variables from `.env.example`

---

## 🔑 Environment Variables

See `backend/.env.example` for all variables:

```env
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/vibes_db
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
MAPTILER_KEY=optional-for-better-maps
```

---

## 📡 API Reference

Full API documentation at `GET /api` after starting the server.

Key endpoints:
```
POST /api/auth/register
POST /api/auth/login
GET  /api/venues?lat=41.69&lng=44.80&radius=1000
GET  /api/events?city=Tbilisi
POST /api/bookings
POST /api/ai/generate-promo
GET  /api/maps/route?from_lat=...&to_lat=...
```

---

## 🛠 Tech Stack

**Frontend:** Vanilla HTML/CSS/JS · Leaflet.js · OSRM routing

**Backend:** Node.js · Express · PostgreSQL + PostGIS · Socket.io · JWT · Anthropic Claude

---

## 📄 License

MIT
