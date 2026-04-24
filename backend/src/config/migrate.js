require('dotenv').config();
const { pool } = require('./database');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable PostGIS for geolocation queries
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── USERS ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(20) NOT NULL DEFAULT 'guest' CHECK (role IN ('guest','business','admin')),
        avatar_url TEXT,
        phone VARCHAR(30),
        city VARCHAR(100) DEFAULT 'Tbilisi',
        bio TEXT,
        refresh_token TEXT,
        email_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── VENUES ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS venues (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL CHECK (category IN ('restaurant','bar','club','cafe','hookah','rooftop','event_space','other')),
        address TEXT NOT NULL,
        city VARCHAR(100) DEFAULT 'Tbilisi',
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        location GEOGRAPHY(POINT, 4326),
        phone VARCHAR(30),
        website TEXT,
        instagram TEXT,
        working_hours JSONB DEFAULT '{}',
        price_range VARCHAR(10) CHECK (price_range IN ('$','$$','$$$','$$$$')),
        features TEXT[] DEFAULT '{}',
        photos TEXT[] DEFAULT '{}',
        cover_photo TEXT,
        avg_rating DECIMAL(3,2) DEFAULT 0,
        review_count INT DEFAULT 0,
        is_published BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','suspended')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── EVENTS ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        organizer_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'other',
        date DATE NOT NULL,
        time_from TIME,
        time_to TIME,
        price DECIMAL(10,2),
        currency VARCHAR(5) DEFAULT 'GEL',
        booking_available BOOLEAN DEFAULT false,
        max_capacity INT,
        photos TEXT[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','ended')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── BOOKINGS ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        venue_id UUID REFERENCES venues(id),
        event_id UUID REFERENCES events(id),
        guest_name VARCHAR(100),
        guest_phone VARCHAR(30),
        guests_count INT NOT NULL DEFAULT 1,
        table_number INT,
        date DATE NOT NULL,
        time TIME NOT NULL,
        special_requests TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
        confirmed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── REVIEWS ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        venue_id UUID NOT NULL REFERENCES venues(id),
        booking_id UUID REFERENCES bookings(id),
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        text TEXT,
        photos TEXT[] DEFAULT '{}',
        owner_reply TEXT,
        owner_replied_at TIMESTAMPTZ,
        is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, venue_id)
      )
    `);

    // ── MESSAGES ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        guest_id UUID NOT NULL REFERENCES users(id),
        business_id UUID NOT NULL REFERENCES users(id),
        venue_id UUID REFERENCES venues(id),
        last_message TEXT,
        last_message_at TIMESTAMPTZ,
        unread_guest INT DEFAULT 0,
        unread_business INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(guest_id, business_id, venue_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id),
        text TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── MANAGERS ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS managers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID NOT NULL REFERENCES users(id),
        manager_id UUID REFERENCES users(id),
        name VARCHAR(100) NOT NULL,
        surname VARCHAR(100),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        role VARCHAR(50) DEFAULT 'manager',
        venues UUID[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited','active','inactive')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── FAVORITES ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        venue_id UUID NOT NULL REFERENCES venues(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, venue_id)
      )
    `);

    // ── AI CONTENT ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_content (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID REFERENCES events(id),
        user_id UUID NOT NULL REFERENCES users(id),
        platform VARCHAR(20) NOT NULL CHECK (platform IN ('tiktok','instagram','facebook','description')),
        tone VARCHAR(20) DEFAULT 'party',
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── INDEXES ──────────────────────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_venues_owner ON venues(owner_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_venues_location ON venues USING GIST(location)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_venue ON bookings(venue_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reviews_venue ON reviews(venue_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);

    await client.query('COMMIT');
    console.log('✅ Migration completed — all tables created');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

migrate();
