const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'VibesInTheCity/1.0 (contact@yourdomain.com)' };

// ── GEOCODING ────────────────────────────────────────────────────────────────

// GET /api/maps/geocode?q=Rustaveli+Ave+Tbilisi
// Convert address text → coordinates (FREE, no API key)
router.get('/geocode', async (req, res, next) => {
  try {
    const { q, city = 'Tbilisi', country = 'Georgia' } = req.query;
    if (!q) return res.status(400).json({ error: 'q (query) parameter required' });

    const searchQuery = `${q}, ${city}, ${country}`;
    const url = `${NOMINATIM}/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;

    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();

    const results = data.map(item => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      display_name: item.display_name,
      type: item.type,
      address: {
        road: item.address?.road,
        suburb: item.address?.suburb,
        city: item.address?.city || item.address?.town,
        country: item.address?.country,
      },
    }));

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/maps/reverse?lat=41.6938&lng=44.8015
// Convert coordinates → address (reverse geocoding, FREE)
router.get('/reverse', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();

    if (data.error) return res.status(404).json({ error: 'Location not found' });

    res.json({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      display_name: data.display_name,
      address: {
        road: data.address?.road,
        house_number: data.address?.house_number,
        suburb: data.address?.suburb,
        city: data.address?.city || data.address?.town,
        postcode: data.address?.postcode,
        country: data.address?.country,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── ROUTING ──────────────────────────────────────────────────────────────────

// GET /api/maps/route?from_lat=41.69&from_lng=44.80&to_lat=41.70&to_lng=44.81&mode=walking
// Get route between two points (FREE via OSRM public server)
router.get('/route', async (req, res, next) => {
  try {
    const { from_lat, from_lng, to_lat, to_lng, mode = 'walking' } = req.query;

    if (!from_lat || !from_lng || !to_lat || !to_lng) {
      return res.status(400).json({ error: 'from_lat, from_lng, to_lat, to_lng required' });
    }

    // OSRM public demo server (free, rate limited)
    // For production: self-host or use OpenRouteService
    const profile = mode === 'driving' ? 'car' : mode === 'cycling' ? 'bike' : 'foot';
    const url = `http://router.project-osrm.org/route/v1/${profile}/${from_lng},${from_lat};${to_lng},${to_lat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const route = data.routes[0];

    res.json({
      distance_meters: Math.round(route.distance),
      distance_text: route.distance < 1000
        ? `${Math.round(route.distance)} m`
        : `${(route.distance / 1000).toFixed(1)} km`,
      duration_seconds: Math.round(route.duration),
      duration_text: route.duration < 60
        ? `${Math.round(route.duration)} sec`
        : `${Math.round(route.duration / 60)} min`,
      geometry: route.geometry, // GeoJSON LineString for map display
      steps: route.legs[0]?.steps?.map(s => ({
        instruction: s.maneuver?.type,
        distance: Math.round(s.distance),
        duration: Math.round(s.duration),
        name: s.name,
      })) || [],
    });
  } catch (err) {
    next(err);
  }
});

// ── NEARBY VENUES ────────────────────────────────────────────────────────────

// GET /api/maps/nearby?lat=41.69&lng=44.80&radius=500&category=bar
// Find venues near a point (uses PostGIS)
router.get('/nearby', optionalAuth, async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000, category, limit = 10 } = req.query;

    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    let conditions = [`v.status = 'published'`];
    const params = [parseFloat(lng), parseFloat(lat), parseInt(radius)];
    let idx = 4;

    if (category) {
      conditions.push(`v.category = $${idx++}`);
      params.push(category);
    }

    params.push(parseInt(limit));

    const result = await query(
      `SELECT
        v.id, v.name, v.category, v.address, v.cover_photo,
        v.avg_rating, v.price_range, v.lat, v.lng,
        ST_Distance(
          v.location::geography,
          ST_MakePoint($1, $2)::geography
        ) AS distance_meters
       FROM venues v
       WHERE v.location IS NOT NULL
         AND ST_DWithin(v.location::geography, ST_MakePoint($1, $2)::geography, $3)
         AND ${conditions.join(' AND ')}
       ORDER BY distance_meters ASC
       LIMIT $${idx}`,
      params
    );

    const venues = result.rows.map(v => ({
      ...v,
      distance_text: v.distance_meters < 1000
        ? `${Math.round(v.distance_meters)} m`
        : `${(v.distance_meters / 1000).toFixed(1)} km`,
    }));

    res.json(venues);
  } catch (err) {
    next(err);
  }
});

// ── MAP TILES PROXY (optional) ────────────────────────────────────────────────

// GET /api/maps/tile-key
// Return MapTiler key for frontend (keep key server-side)
router.get('/tile-key', (req, res) => {
  // In production: return key only to authenticated users
  // or use a domain-restricted key from MapTiler dashboard
  res.json({
    provider: 'maptiler',
    key: process.env.MAPTILER_KEY || null,
    styles: {
      streets: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png',
      satellite: 'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg',
      dark: 'https://api.maptiler.com/maps/backdrop-dark/{z}/{x}/{y}.png',
    },
    // Fallback: always free, no key needed
    fallback: {
      streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
    },
  });
});

// ── TBILISI DISTRICTS ────────────────────────────────────────────────────────

// GET /api/maps/districts
// Tbilisi neighborhood list for venue filtering
router.get('/districts', (req, res) => {
  res.json([
    { id: 'old_town', name: 'Old Town / Dzveli Tbilisi', lat: 41.6902, lng: 44.8012 },
    { id: 'rustaveli', name: 'Rustaveli Ave', lat: 41.6956, lng: 44.8015 },
    { id: 'vake', name: 'Vake', lat: 41.7089, lng: 44.7750 },
    { id: 'saburtalo', name: 'Saburtalo', lat: 41.7200, lng: 44.7650 },
    { id: 'vera', name: 'Vera', lat: 41.7010, lng: 44.7850 },
    { id: 'mtatsminda', name: 'Mtatsminda', lat: 41.6940, lng: 44.7950 },
    { id: 'sololaki', name: 'Sololaki', lat: 41.6880, lng: 44.7980 },
    { id: 'avlabari', name: 'Avlabari', lat: 41.6850, lng: 44.8150 },
    { id: 'gldani', name: 'Gldani', lat: 41.7550, lng: 44.8100 },
    { id: 'isani', name: 'Isani / Samgori', lat: 41.6750, lng: 44.8350 },
  ]);
});

module.exports = router;
