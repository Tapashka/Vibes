# Vibes in the City 🎵

Mobile app prototype for discovering nightlife venues, events, and experiences in Tbilisi.

## Quick Start

Open `vibes-unified.html` in any modern browser — everything is in one file.

## Project Structure

```
vibes-in-the-city/
├── vibes-unified.html      ← Full working app (single file)
├── index.html              ← Multi-file entry point
├── css/
│   ├── main.css            ← Core styles (phone, screens, map, UI)
│   └── business.css        ← Business cabinet styles
├── js/
│   ├── data.js             ← Mock data, NAV_MAP, constants
│   ├── map.js              ← Leaflet map, pins, routing
│   ├── venue.js            ← Venue card, tabs, AI chat
│   ├── booking.js          ← Table booking, floor plan
│   └── utils.js            ← Search, filters, helpers
└── screens/
    ├── splash.html         ← Splash screen
    ├── map.html            ← Main map screen
    ├── venue.html          ← Venue + booking + filter
    ├── events.html         ← Tonight's Vibes
    ├── favorites.html      ← Saved Places
    ├── profile.html        ← User profile + sub-screens
    ├── auth.html           ← Login + Business login
    ├── business.html       ← Business cabinet (12 screens)
    └── nav.html            ← Bottom navigation
```

## Features

| Feature | Status |
|---------|--------|
| 🗺️ Interactive Leaflet map | ✅ |
| 📍 Venue pins with photos | ✅ |
| 🔍 Search with live results | ✅ |
| 📅 Events calendar | ✅ |
| ❤️ Save favourite places | ✅ |
| 🎯 Table booking (floor plan) | ✅ |
| 👤 User profile | ✅ |
| 💼 Business Cabinet | ✅ |
| 🤖 AI promo content (Claude API) | ✅ |
| ✨ AI description improvement | ✅ |
| 📣 TikTok / Instagram / Facebook posts | ✅ |

## Business Cabinet Screens

- Dashboard (grid + list)
- My Places + Add/Edit Place
- My Events + Add Event with AI Promo
- My Managers + Add Manager
- Bookings (confirm/decline)
- Reviews (rating + list)
- Messages (chat list)
- Settings

## Tech Stack

- Vanilla HTML/CSS/JS (no frameworks)
- [Leaflet.js](https://leafletjs.com/) for maps
- [Anthropic Claude API](https://anthropic.com) for AI features
- Google Fonts (Inter + Playfair Display)

## Deployment

### GitHub Pages
1. Push to GitHub
2. Settings → Pages → Branch: main → / (root)
3. App available at `https://username.github.io/repo-name`

### Local
```bash
# Any static server works:
npx serve .
# or
python3 -m http.server 8080
```
