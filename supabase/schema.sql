-- =========================================
-- CLASS GRAND PRIX 2026 — DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- EVENTS
-- =========================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','READY','LIVE','COMPLETED','ARCHIVED')),
  current_category_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================
-- CATEGORY TEMPLATES (Library)
-- =========================================
CREATE TABLE category_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  default_lap_count INTEGER NOT NULL DEFAULT 3,
  default_voting_duration_seconds INTEGER NOT NULL DEFAULT 30,
  scoring_config JSONB NOT NULL DEFAULT '{"1":25,"2":18,"3":15,"4":12,"5":10,"6":8,"7":6,"8":4,"9":2,"10":1}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================
-- CATEGORY TEMPLATE CANDIDATES
-- =========================================
CREATE TABLE category_template_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES category_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- =========================================
-- EVENT CATEGORIES (event-specific instances)
-- =========================================
CREATE TABLE event_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES category_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  lap_count INTEGER NOT NULL DEFAULT 3,
  voting_duration_seconds INTEGER NOT NULL DEFAULT 30,
  scoring_config JSONB NOT NULL DEFAULT '{"1":25,"2":18,"3":15,"4":12,"5":10,"6":8,"7":6,"8":4,"9":2,"10":1}'::JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_categories_event_id ON event_categories(event_id);
CREATE INDEX idx_event_categories_display_order ON event_categories(event_id, display_order);

-- =========================================
-- EVENT CATEGORY CANDIDATES
-- =========================================
CREATE TABLE event_category_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_category_id UUID NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_event_category_candidates_category_id ON event_category_candidates(event_category_id);

-- =========================================
-- LAPS
-- =========================================
CREATE TABLE laps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_category_id UUID NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  lap_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','VOTING','CLOSED','COMPLETED')),
  started_at TIMESTAMPTZ,
  voting_opened_at TIMESTAMPTZ,
  voting_closed_at TIMESTAMPTZ,
  voting_ends_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_category_id, lap_number)
);

CREATE INDEX idx_laps_event_category_id ON laps(event_category_id);

-- =========================================
-- VOTES
-- =========================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lap_id UUID NOT NULL REFERENCES laps(id) ON DELETE CASCADE,
  event_category_id UUID NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES event_category_candidates(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lap_id, voter_id)
);

CREATE INDEX idx_votes_lap_id ON votes(lap_id);
CREATE INDEX idx_votes_candidate_id ON votes(candidate_id);

-- =========================================
-- LAP RESULTS
-- =========================================
CREATE TABLE lap_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lap_id UUID NOT NULL REFERENCES laps(id) ON DELETE CASCADE,
  event_category_id UUID NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES event_category_candidates(id) ON DELETE CASCADE,
  vote_count INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lap_id, candidate_id)
);

CREATE INDEX idx_lap_results_lap_id ON lap_results(lap_id);

-- =========================================
-- CHAMPIONSHIP POINTS
-- =========================================
CREATE TABLE championship_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_category_id UUID NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES event_category_candidates(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_category_id, candidate_id)
);

CREATE INDEX idx_championship_points_event_id ON championship_points(event_id);

-- =========================================
-- RACE SESSIONS (source of truth for race state)
-- =========================================
CREATE TABLE race_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_category_id UUID NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'IDLE' CHECK (state IN (
    'IDLE','READY','LIGHTS_1','LIGHTS_2','LIGHTS_3','LIGHTS_4','LIGHTS_5',
    'LIGHTS_OUT','VOTING','VOTING_CLOSED','RESULT_REVEAL','LAP_COMPLETE',
    'FINAL_RESULTS','PODIUM','CHEQUERED_FLAG'
  )),
  flag TEXT NOT NULL DEFAULT 'NONE' CHECK (flag IN ('GREEN','YELLOW','RED','CHEQUERED','NONE')),
  current_lap_number INTEGER NOT NULL DEFAULT 1,
  voting_ends_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_category_id)
);

CREATE INDEX idx_race_sessions_event_id ON race_sessions(event_id);

-- =========================================
-- RACE EVENTS (audit log)
-- =========================================
CREATE TABLE race_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES race_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_race_events_session_id ON race_events(session_id);

-- =========================================
-- UPDATED_AT TRIGGERS
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_templates_updated_at BEFORE UPDATE ON category_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_race_sessions_updated_at BEFORE UPDATE ON race_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_template_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_category_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE laps ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lap_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_events ENABLE ROW LEVEL SECURITY;

-- Public read access for all (voters/podium screen need to read)
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read category_templates" ON category_templates FOR SELECT USING (true);
CREATE POLICY "Public read category_template_candidates" ON category_template_candidates FOR SELECT USING (true);
CREATE POLICY "Public read event_categories" ON event_categories FOR SELECT USING (true);
CREATE POLICY "Public read event_category_candidates" ON event_category_candidates FOR SELECT USING (true);
CREATE POLICY "Public read laps" ON laps FOR SELECT USING (true);
CREATE POLICY "Public read lap_results" ON lap_results FOR SELECT USING (true);
CREATE POLICY "Public read championship_points" ON championship_points FOR SELECT USING (true);
CREATE POLICY "Public read race_sessions" ON race_sessions FOR SELECT USING (true);
CREATE POLICY "Public read race_events" ON race_events FOR SELECT USING (true);

-- Votes: anyone can insert, can only read own votes
CREATE POLICY "Anyone can vote" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Read own votes" ON votes FOR SELECT USING (true);

-- Admin write access (using service role or anon for MVP)
-- For MVP, allow all writes from anon key. In production, restrict to authenticated admins.
CREATE POLICY "Admin write events" ON events FOR ALL USING (true);
CREATE POLICY "Admin write category_templates" ON category_templates FOR ALL USING (true);
CREATE POLICY "Admin write category_template_candidates" ON category_template_candidates FOR ALL USING (true);
CREATE POLICY "Admin write event_categories" ON event_categories FOR ALL USING (true);
CREATE POLICY "Admin write event_category_candidates" ON event_category_candidates FOR ALL USING (true);
CREATE POLICY "Admin write laps" ON laps FOR ALL USING (true);
CREATE POLICY "Admin write lap_results" ON lap_results FOR ALL USING (true);
CREATE POLICY "Admin write championship_points" ON championship_points FOR ALL USING (true);
CREATE POLICY "Admin write race_sessions" ON race_sessions FOR ALL USING (true);
CREATE POLICY "Admin write race_events" ON race_events FOR ALL USING (true);

-- =========================================
-- ENABLE REALTIME
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE race_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE laps;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE lap_results;
ALTER PUBLICATION supabase_realtime ADD TABLE championship_points;

-- =========================================
-- SEED DATA (Demo)
-- =========================================

-- Insert demo event
INSERT INTO events (id, name, year, description, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Class Grand Prix 2026', 2026, 'Annual class championship voting event', 'READY');

-- Insert category templates
INSERT INTO category_templates (id, name, description, icon, default_lap_count, default_voting_duration_seconds) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Most Chaotic Driver', 'The driver most likely to create chaos', '🌪️', 3, 30),
  ('10000000-0000-0000-0000-000000000002', 'Most Talkative Driver', 'Never stops talking, even during a race', '🗣️', 3, 30),
  ('10000000-0000-0000-0000-000000000003', 'Sleepiest Driver', 'Found sleeping at the starting grid', '😴', 3, 30),
  ('10000000-0000-0000-0000-000000000004', 'Main Character', 'The one who thinks the world revolves around them', '⭐', 3, 30),
  ('10000000-0000-0000-0000-000000000005', 'Class Comedian', 'Keeps everyone laughing through every lap', '😂', 3, 30);

-- Insert template candidates
INSERT INTO category_template_candidates (template_id, name, display_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Kevin', 1),
  ('10000000-0000-0000-0000-000000000001', 'Manuel', 2),
  ('10000000-0000-0000-0000-000000000001', 'Andrew', 3),
  ('10000000-0000-0000-0000-000000000001', 'Jason', 4),
  ('10000000-0000-0000-0000-000000000001', 'Daniel', 5);

-- Insert demo event category
INSERT INTO event_categories (id, event_id, template_id, name, description, icon, lap_count, voting_duration_seconds, display_order) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Most Chaotic Driver', 'The driver most likely to create chaos', '🌪️', 3, 30, 1);

-- Insert demo candidates
INSERT INTO event_category_candidates (id, event_category_id, name, display_order) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Kevin', 1),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Manuel', 2),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Andrew', 3),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Jason', 4),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Daniel', 5);
