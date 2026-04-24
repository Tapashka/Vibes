// ════════════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════════════
const express = require('express');
const eventsRouter = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');

// GET /api/events — list events
eventsRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { venue_id, date, city = 'Tbilisi', category, limit = 20, offset = 0 } = req.query;

    let conditions = [`e.status = 'published'`, `e.date >= CURRENT_DATE`];
    let params = [];
    let idx = 1;

    if (venue_id) { conditions.push(`e.venue_id = $${idx++}`); params.push(venue_id); }
    if (date) { conditions.push(`e.date = $${idx++}`); params.push(date); }
    if (category) { conditions.push(`e.category = $${idx++}`); params.push(category); }
    if (city) { conditions.push(`v.city ILIKE $${idx++}`); params.push(city); }

    params.push(parseInt(limit), parseInt(offset));

    const result = await query(
      `SELECT e.*, v.name AS venue_name, v.address AS venue_address, v.cover_photo AS venue_photo
       FROM events e
       JOIN venues v ON e.venue_id = v.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.date ASC, e.time_from ASC
       LIMIT $${idx} OFFSET $${idx+1}`,
      params
    );

    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/events/:id
eventsRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.*, v.name AS venue_name, v.address, v.lat, v.lng, v.city
       FROM events e JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/events/venue/:venueId/my
eventsRouter.get('/venue/:venueId/my', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.* FROM events e
       JOIN venues v ON e.venue_id = v.id
       WHERE e.venue_id = $1 AND v.owner_id = $2
       ORDER BY e.date DESC`,
      [req.params.venueId, req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/events
eventsRouter.post('/', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const { venue_id, title, description, category, date, time_from, time_to,
            price, booking_available = false, max_capacity, photos = [] } = req.body;

    if (!venue_id || !title || !date) {
      return res.status(400).json({ error: 'venue_id, title and date required' });
    }

    // Verify venue ownership
    const venue = await query('SELECT owner_id FROM venues WHERE id = $1', [venue_id]);
    if (!venue.rows.length || venue.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your venue' });
    }

    const result = await query(
      `INSERT INTO events (venue_id, organizer_id, title, description, category, date,
        time_from, time_to, price, booking_available, max_capacity, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [venue_id, req.user.id, title, description, category, date,
       time_from, time_to, price, booking_available, max_capacity, photos]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/events/:id
eventsRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, description, date, time_from, time_to, price,
            booking_available, max_capacity, photos, status } = req.body;

    const existing = await query(
      `SELECT e.organizer_id FROM events e JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1 AND (e.organizer_id = $2 OR v.owner_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!existing.rows.length) return res.status(403).json({ error: 'Not your event' });

    const result = await query(
      `UPDATE events SET
        title=COALESCE($1,title), description=COALESCE($2,description),
        date=COALESCE($3,date), time_from=COALESCE($4,time_from),
        time_to=COALESCE($5,time_to), price=COALESCE($6,price),
        booking_available=COALESCE($7,booking_available),
        max_capacity=COALESCE($8,max_capacity),
        photos=COALESCE($9,photos), status=COALESCE($10,status),
        updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, description, date, time_from, time_to, price,
       booking_available, max_capacity, photos, status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/events/:id
eventsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query(
      `DELETE FROM events WHERE id = $1 AND organizer_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Event deleted' });
  } catch (err) { next(err); }
});

module.exports.eventsRouter = eventsRouter;


// ════════════════════════════════════════════════════
// BOOKINGS
// ════════════════════════════════════════════════════
const bookingsRouter = express.Router();

// GET /api/bookings/my — user's own bookings
bookingsRouter.get('/my', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*, v.name AS venue_name, v.address, v.cover_photo,
              e.title AS event_title
       FROM bookings b
       LEFT JOIN venues v ON b.venue_id = v.id
       LEFT JOIN events e ON b.event_id = e.id
       WHERE b.user_id = $1
       ORDER BY b.date DESC, b.time DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/bookings/venue/:venueId — business sees their venue's bookings
bookingsRouter.get('/venue/:venueId', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const { status, date } = req.query;
    let conditions = ['b.venue_id = $1', 'v.owner_id = $2'];
    const params = [req.params.venueId, req.user.id];
    let idx = 3;

    if (status) { conditions.push(`b.status = $${idx++}`); params.push(status); }
    if (date) { conditions.push(`b.date = $${idx++}`); params.push(date); }

    const result = await query(
      `SELECT b.*, u.name AS guest_name_user, u.phone AS guest_phone_user
       FROM bookings b
       JOIN venues v ON b.venue_id = v.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.date ASC, b.time ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/bookings
bookingsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { venue_id, event_id, date, time, guests_count = 1,
            guest_name, guest_phone, table_number, special_requests } = req.body;

    if (!date || !time) {
      return res.status(400).json({ error: 'date and time required' });
    }

    const result = await query(
      `INSERT INTO bookings
        (user_id, venue_id, event_id, date, time, guests_count,
         guest_name, guest_phone, table_number, special_requests)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [req.user.id, venue_id, event_id, date, time, guests_count,
       guest_name || null, guest_phone || null, table_number || null,
       special_requests || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/bookings/:id/status — business confirms/declines
bookingsRouter.put('/:id/status', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['confirmed','cancelled'].includes(status)) {
      return res.status(400).json({ error: 'status must be confirmed or cancelled' });
    }

    const result = await query(
      `UPDATE bookings SET
        status = $1,
        confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END,
        cancelled_at = CASE WHEN $1 = 'cancelled' THEN NOW() ELSE cancelled_at END,
        updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/bookings/:id — user cancels
bookingsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query(
      `UPDATE bookings SET status='cancelled', cancelled_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Booking cancelled' });
  } catch (err) { next(err); }
});

module.exports.bookingsRouter = bookingsRouter;


// ════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════
const reviewsRouter = express.Router();

// GET /api/reviews/venue/:venueId
reviewsRouter.get('/venue/:venueId', optionalAuth, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await query(
      `SELECT r.*, u.name AS user_name, u.avatar_url
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.venue_id = $1 AND r.is_visible = true
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.venueId, limit, offset]
    );

    const stats = await query(
      `SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS total,
              COUNT(CASE WHEN rating=5 THEN 1 END) AS five_star,
              COUNT(CASE WHEN rating=4 THEN 1 END) AS four_star,
              COUNT(CASE WHEN rating=3 THEN 1 END) AS three_star,
              COUNT(CASE WHEN rating=2 THEN 1 END) AS two_star,
              COUNT(CASE WHEN rating=1 THEN 1 END) AS one_star
       FROM reviews WHERE venue_id=$1 AND is_visible=true`,
      [req.params.venueId]
    );

    res.json({ reviews: result.rows, stats: stats.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/reviews
reviewsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { venue_id, rating, text, photos = [] } = req.body;
    if (!venue_id || !rating) {
      return res.status(400).json({ error: 'venue_id and rating required' });
    }

    const result = await query(
      `INSERT INTO reviews (user_id, venue_id, rating, text, photos)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, venue_id) DO UPDATE
         SET rating=$3, text=$4, photos=$5, updated_at=NOW()
       RETURNING *`,
      [req.user.id, venue_id, rating, text, photos]
    );

    // Update venue avg_rating
    await query(
      `UPDATE venues SET
        avg_rating = (SELECT AVG(rating) FROM reviews WHERE venue_id=$1 AND is_visible=true),
        review_count = (SELECT COUNT(*) FROM reviews WHERE venue_id=$1 AND is_visible=true)
       WHERE id=$1`,
      [venue_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/reviews/:id/reply — owner replies
reviewsRouter.post('/:id/reply', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const { reply } = req.body;
    const result = await query(
      `UPDATE reviews SET owner_reply=$1, owner_replied_at=NOW()
       WHERE id=$2 RETURNING *`,
      [reply, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports.reviewsRouter = reviewsRouter;


// ════════════════════════════════════════════════════
// MESSAGES
// ════════════════════════════════════════════════════
const messagesRouter = express.Router();

// GET /api/messages/conversations
messagesRouter.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const isGuest = req.user.role === 'guest';
    const field = isGuest ? 'guest_id' : 'business_id';
    const unreadField = isGuest ? 'unread_guest' : 'unread_business';

    const result = await query(
      `SELECT c.*,
        g.name AS guest_name, g.avatar_url AS guest_avatar,
        b.name AS business_name, b.avatar_url AS business_avatar,
        v.name AS venue_name
       FROM conversations c
       JOIN users g ON c.guest_id = g.id
       JOIN users b ON c.business_id = b.id
       LEFT JOIN venues v ON c.venue_id = v.id
       WHERE c.${field} = $1
       ORDER BY c.last_message_at DESC NULLS LAST`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/messages/conversations/:id
messagesRouter.get('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const msgs = await query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    // Mark as read
    const isGuest = req.user.role === 'guest';
    await query(
      `UPDATE conversations SET ${isGuest ? 'unread_guest' : 'unread_business'} = 0
       WHERE id = $1`,
      [req.params.id]
    );
    await query(
      `UPDATE messages SET is_read = true
       WHERE conversation_id = $1 AND sender_id != $2`,
      [req.params.id, req.user.id]
    );

    res.json(msgs.rows);
  } catch (err) { next(err); }
});

// POST /api/messages — send message
messagesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { business_id, venue_id, text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message text required' });

    const guest_id = req.user.role === 'guest' ? req.user.id : null;
    const biz_id = req.user.role === 'business' ? req.user.id : business_id;

    if (!guest_id && !biz_id) {
      return res.status(400).json({ error: 'business_id required' });
    }

    // Get or create conversation
    let conv = await query(
      `SELECT id FROM conversations WHERE guest_id=$1 AND business_id=$2
       AND (venue_id=$3 OR ($3::uuid IS NULL AND venue_id IS NULL))`,
      [guest_id || req.body.guest_id, biz_id, venue_id || null]
    );

    if (!conv.rows.length) {
      conv = await query(
        `INSERT INTO conversations (guest_id, business_id, venue_id)
         VALUES ($1,$2,$3) RETURNING id`,
        [guest_id || req.body.guest_id, biz_id, venue_id || null]
      );
    }

    const convId = conv.rows[0].id;
    const isGuest = req.user.role === 'guest';

    const msg = await query(
      `INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1,$2,$3) RETURNING *`,
      [convId, req.user.id, text]
    );

    await query(
      `UPDATE conversations SET
        last_message=$1, last_message_at=NOW(),
        ${isGuest ? 'unread_business' : 'unread_guest'} = ${isGuest ? 'unread_business' : 'unread_guest'} + 1
       WHERE id=$2`,
      [text, convId]
    );

    res.status(201).json(msg.rows[0]);
  } catch (err) { next(err); }
});

module.exports.messagesRouter = messagesRouter;


// ════════════════════════════════════════════════════
// MANAGERS
// ════════════════════════════════════════════════════
const managersRouter = express.Router();

managersRouter.get('/', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM managers WHERE owner_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

managersRouter.post('/', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const { name, surname, email, phone, venues = [] } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });

    const result = await query(
      `INSERT INTO managers (owner_id, name, surname, email, phone, venues)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, name, surname, email, phone, venues]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

managersRouter.put('/:id', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    const { name, surname, phone, venues, status } = req.body;
    const result = await query(
      `UPDATE managers SET
        name=COALESCE($1,name), surname=COALESCE($2,surname),
        phone=COALESCE($3,phone), venues=COALESCE($4,venues),
        status=COALESCE($5,status)
       WHERE id=$6 AND owner_id=$7 RETURNING *`,
      [name, surname, phone, venues, status, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Manager not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

managersRouter.delete('/:id', authenticate, requireRole('business','admin'), async (req, res, next) => {
  try {
    await query('DELETE FROM managers WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Manager removed' });
  } catch (err) { next(err); }
});

module.exports.managersRouter = managersRouter;
