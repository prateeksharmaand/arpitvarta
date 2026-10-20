-- ============================================================
-- ArpitVarta — consolidated schema
-- Marketplace connecting users with verified professionals of any
-- profession (doctors, lawyers, CAs, tutors, coaches, …) over paid
-- per-minute chat / voice / video consultations.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  gender VARCHAR(20),
  date_of_birth DATE,
  city VARCHAR(120),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'professional')),
  is_banned BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN DEFAULT FALSE,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── Profession categories ────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(16) NOT NULL DEFAULT '💼',
  description TEXT,
  sub_specialities TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Professionals ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  display_name VARCHAR(255) NOT NULL,
  profession_title VARCHAR(150),            -- e.g. "Cardiologist", "Corporate Lawyer"
  bio TEXT,
  avatar_url TEXT,
  experience_years INTEGER DEFAULT 0,
  qualifications TEXT[] DEFAULT '{}',       -- e.g. {"MBBS","MD (Cardiology)"}
  license_number VARCHAR(100),              -- registration / bar / ICAI no.
  documents JSONB DEFAULT '[]',             -- uploaded license / degree proofs
  organization VARCHAR(200),                -- current firm / hospital / institute
  city VARCHAR(120),
  languages VARCHAR(50)[] DEFAULT ARRAY['English'],
  specializations VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR[],
  expertise_areas VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR[],
  per_minute_rate_chat DECIMAL(10,2) DEFAULT 10.00,
  per_minute_rate_call DECIMAL(10,2) DEFAULT 15.00,
  per_minute_rate_video DECIMAL(10,2) DEFAULT 20.00,
  total_consultations INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  verification_badge VARCHAR(50),
  queue_count INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  on_hold_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_withdrawal_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_professionals_online ON professionals(is_online, is_available);
CREATE INDEX IF NOT EXISTS idx_professionals_rating ON professionals(rating DESC);
CREATE INDEX IF NOT EXISTS idx_professionals_status ON professionals(status);
CREATE INDEX IF NOT EXISTS idx_professionals_category ON professionals(category_id);

CREATE TABLE IF NOT EXISTS professional_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS professional_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consultation_id UUID,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(professional_id, user_id, consultation_id)
);

-- ── Consultations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('chat', 'voice', 'video')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','queued','connecting','active','completed','cancelled','failed','refunded')),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  per_minute_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  user_wallet_deducted DECIMAL(10,2) DEFAULT 0.00,
  professional_earning DECIMAL(10,2) DEFAULT 0.00,
  platform_fee DECIMAL(10,2) DEFAULT 0.00,
  session_token VARCHAR(255),
  webrtc_room_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultations_user ON consultations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_professional ON consultations(professional_id, status);

CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user','professional','system')),
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','audio','system')),
  content TEXT,
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_consultation ON consultation_messages(consultation_id, created_at);

CREATE TABLE IF NOT EXISTS consultation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  consultation_type VARCHAR(20) NOT NULL,
  position INTEGER NOT NULL,
  estimated_wait_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting','called','cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_complaints (
  id SERIAL PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Persistent chat thread per user<>professional pair
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, professional_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_role VARCHAR(20) NOT NULL,          -- 'user' | 'professional' | 'system'
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',   -- 'text' | 'session_start' | 'session_end'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_created_at ON thread_messages(thread_id, created_at DESC);

-- ── Wallet & payments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'INR',
  total_added DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  total_refunded DECIMAL(10,2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('credit','debit','refund','cashback','bonus')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  description TEXT,
  reference_id VARCHAR(255),
  reference_type VARCHAR(50),
  payment_gateway VARCHAR(50),
  gateway_transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('pending','success','failed','refunded')),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recharge_offers (
  id SERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  bonus_percent INTEGER NOT NULL DEFAULT 0,
  label VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  wallet_credit DECIMAL(10,2) NOT NULL,
  bonus_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB DEFAULT '[]',
  free_minutes INTEGER DEFAULT 0,
  discount_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  amount_paid DECIMAL(10,2),
  transaction_id UUID REFERENCES wallet_transactions(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Professional payouts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_payout_details (
  id SERIAL PRIMARY KEY,
  professional_id UUID NOT NULL UNIQUE REFERENCES professionals(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL CHECK (method IN ('upi','paytm','bank')),
  upi_id VARCHAR(100),
  paytm_number VARCHAR(20),
  bank_account_number VARCHAR(30),
  bank_ifsc VARCHAR(20),
  bank_account_name VARCHAR(100),
  bank_name VARCHAR(100),
  razorpay_contact_id VARCHAR(50),
  razorpay_fund_account_id VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  process_after TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  razorpay_payout_id VARCHAR(50),
  remarks TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_professional ON withdrawal_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_process ON withdrawal_requests(status, process_after);

-- ── Live sessions & community ────────────────────────────────
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_key VARCHAR(255),
  stream_url TEXT,
  agora_channel VARCHAR(255),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  viewer_count INTEGER DEFAULT 0,
  peak_viewer_count INTEGER DEFAULT 0,
  total_tips DECIMAL(10,2) DEFAULT 0.00,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status, scheduled_at);

CREATE TABLE IF NOT EXISTS live_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id),
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20),
  category VARCHAR(60),                      -- category slug, e.g. 'legal'
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_posts ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20),
  app_type VARCHAR(30) DEFAULT 'user_app' CHECK (app_type IN ('user_app', 'professional_app')),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT push_tokens_user_id_token_app_key UNIQUE (user_id, token, app_type)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_app_type ON push_tokens(app_type);

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  type VARCHAR(50),
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id, is_read);

-- ── AI assistant log (Gemini) ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Professional onboarding applications ─────────────────────
CREATE TABLE IF NOT EXISTS agent_hirings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100),
  dob DATE,
  gender VARCHAR(20),
  languages JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  profession_title VARCHAR(150),
  qualifications JSONB DEFAULT '[]',
  experience_years INTEGER DEFAULT 0,
  license_number VARCHAR(100),
  city VARCHAR(120),
  profile_picture_url TEXT,
  phone_type VARCHAR(20),
  email VARCHAR(200),
  works_online BOOLEAN DEFAULT false,
  hours_available INTEGER,
  about_me TEXT,
  token_no VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  converted_to_professional BOOLEAN DEFAULT FALSE,
  professional_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  temp_password TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_hirings_status ON agent_hirings(status);
CREATE INDEX IF NOT EXISTS idx_agent_hirings_created ON agent_hirings(created_at DESC);

-- ── Sub-admins ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sub_admins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_admins_email ON sub_admins(email);
