const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth, requireVenueOwner, requireRole } = require('../middleware/auth');

// GET /api/venues — list with filters, search, nearby
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      search, category, city = 'Tbilisi',
      lat, lng, radius = 2000,
      price_range, rating_min,
      limit = 20, offset = 0,
    } = req.query;

    let conditions = [`v.status = 'published'`];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(v.name ILIKE $${idx} OR v.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (category) {
      conditions.push(`v.category = $${idx}`);
      params.push(category);
      idx++;
    }

    if (city) {
      conditions.push(`v.city ILIKE $${idx}`);
      params.push(city);
      idx++;
    }

    if (price_range) {
      conditions.push(`v.price_range = $${idx}`);
      params.push(price_range);
      idx++;
    }

    if (rating_min) {
      conditions.push(`v.avg_rating >= $${idx}`);
      params.push(parseFloat(rating_min));
      idx++;
    }

    // Geolocation filter
    let distanceSelect = '';
    if (lat && lng) {
      distanceSelect = `,
        ST_Distance(
          v.location::geography,
          ST_MakePoint($${idx}, $${idx+1})::geography
        ) AS distance_meters`;
      conditions.push(`ST_DWithin(
        v.location::geography,
        ST_MakePoint($${idx}, $${idx+1})::geography,
        $${idx+2}
      )`);
      params.push(parseFloat(lng), parseFloat(lat), parseInt(radius));
      idx += 3;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = lat && lng ? 'ORDER BY distance_meters ASC' : 'ORDER BY v.avg_rating DESC';

    params.push(parseInt(limit), parseInt(offset));

    const sql = `
      SELECT
        v.id, v.name, v.description, v.category,
        v.address, v.city, v.lat, v.lng,
        v.price_range, v.features, v.photos, v.cover_photo,
        v.avg_rating, v.review_count, v.working_hours,
        v.instagram, v.phone,
        u.name AS owner_name
        ${distanceSelect}
      FROM venues v
      JOIN users u ON v.owner_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $${idx} OFFSET $${idx+1}
    `;

    const countSql = `SELECT COUNT(*) FROM venues v ${whereClause}`;

    const [data, count] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2)),
    ]);

    res.json({
      venues: data.rows,
      total: parseInt(count.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/venues/my — owner's own venues
router.get('/my', authenticate, requireRole('business', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, category, address, status, avg_rating, review_count,
              cover_photo, is_published, created_at
       FROM venues WHERE owner_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/venues/:id — single venue detail
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.*, u.name AS owner_name, u.id AS owner_id
       FROM venues v
       JOIN users u ON v.owner_id = u.id
       WHERE v.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const venue = result.rows[0];

    // Check if published OR user is owner
    if (!venue.is_published && req.user?.id !== venue.owner_id && req.user?.role !== 'admin') {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Get upcoming events
    const events = await query(
      `SELECT id, title, date, time_from, price, photos, status
       FROM events WHERE venue_id = $1 AND date >= CURRENT_DATE AND status = 'published'
       ORDER BY date ASC LIMIT 5`,
      [req.params.id]
    );

    // Check if favorited
    let isFavorited = false;
    if (req.user) {
      const fav = await query(
        'SELECT id FROM favorites WHERE user_id = $1 AND venue_id = $2',
        [req.user.id, req.params.id]
      );
      isFavorited = fav.rows.length > 0;
    }

    res.json({ ...venue, events: events.rows, is_favorited: isFavorited });
  } catch (err) {
    next(err);
  }
});

// POST /api/venues — create venue
router.post('/', authenticate, requireRole('business', 'admin'), async (req, res, next) => {
  try {
    const {
      name, description, category, address, city = 'Tbilisi',
      lat, lng, phone, website, instagram,
      working_hours = {}, price_range, features = [], photos = [],
    } = req.body;

    if (!name || !category || !address) {
      return res.status(400).json({ error: 'name, category and address are required' });
    }

    // Build PostGIS point
    const locationSQL = lat && lng
      ? `ST_MakePoint($12, $11)::geography`
      : null;

    const result = await query(
      `INSERT INTO venues
        (owner_id, name, description, category, address, city, lat, lng, location,
         phone, website, instagram, working_hours, price_range, features, photos)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8,
         ${lat && lng ? `ST_MakePoint($12, $11)::geography` : 'NULL'},
         $9, $10, ${lat && lng ? '$13' : '$11'}, ${lat && lng ? '$14' : '$12'},
         ${lat && lng ? '$15' : '$13'}, ${lat && lng ? '$16' : '$14'},
         ${lat && lng ? '$17' : '$15'})
       RETURNING *`,
      lat && lng
        ? [req.user.id, name, description, category, address, city, lat, lng,
           phone, website, lat, lng, instagram, JSON.stringify(working_hours), price_range,
           features, photos]
        : [req.user.id, name, description, category, address, city, null, null,
           phone, website, instagram, JSON.stringify(working_hours), price_range,
           features, photos]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/venues/:id — update venue
router.put('/:id', authenticate, requireVenueOwner, async (req, res, next) => {
  try {
    const {
      name, description, category, address, city,
      lat, lng, phone, website, instagram,
      working_hours, price_range, features, photos, cover_photo, status,
    } = req.body;

    const result = await query(
      `UPDATE venues SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        address = COALESCE($4, address),
        city = COALESCE($5, city),
        lat = COALESCE($6, lat),
        lng = COALESCE($7, lng),
        phone = COALESCE($8, phone),
        website = COALESCE($9, website),
        instagram = COALESCE($10, instagram),
        working_hours = COALESCE($11, working_hours),
        price_range = COALESCE($12, price_range),
        features = COALESCE($13, features),
        photos = COALESCE($14, photos),
        cover_photo = COALESCE($15, cover_photo),
        status = COALESCE($16, status),
        is_published = CASE WHEN $16 = 'published' THEN true ELSE is_published END,
        updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [name, description, category, address, city, lat, lng, phone, website,
       instagram, working_hours ? JSON.stringify(working_hours) : null,
       price_range, features, photos, cover_photo, status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/venues/:id
router.delete('/:id', authenticate, requireVenueOwner, async (req, res, next) => {
  try {
    await query('DELETE FROM venues WHERE id = $1', [req.params.id]);
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/venues/:id/publish
router.post('/:id/publish', authenticate, requireVenueOwner, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE venues SET status = 'published', is_published = true, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/venues/:id/favorite — toggle favorite
router.post('/:id/favorite', authenticate, async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT id FROM favorites WHERE user_id = $1 AND venue_id = $2',
      [req.user.id, req.params.id]
    );

    if (existing.rows.length) {
      await query('DELETE FROM favorites WHERE user_id = $1 AND venue_id = $2',
        [req.user.id, req.params.id]);
      return res.json({ favorited: false });
    } else {
      await query('INSERT INTO favorites (user_id, venue_id) VALUES ($1, $2)',
        [req.user.id, req.params.id]);
      return res.json({ favorited: true });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/venues/favorites/list
router.get('/favorites/list', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.id, v.name, v.category, v.address, v.cover_photo, v.avg_rating, v.price_range
       FROM favorites f
       JOIN venues v ON f.venue_id = v.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
