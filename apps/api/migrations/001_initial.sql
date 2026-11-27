CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  csrf_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS admin_sessions_active_idx
  ON admin_sessions (token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title jsonb NOT NULL,
  short_description jsonb NOT NULL,
  description jsonb NOT NULL,
  instructions jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_id uuid NOT NULL REFERENCES categories(id),
  entry_path text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'unpublished', 'archived')),
  active_revision_id uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS games_public_idx
  ON games (status, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS games_category_idx ON games (category_id, status);
CREATE INDEX IF NOT EXISTS games_title_en_idx ON games ((title ->> 'en'));
CREATE INDEX IF NOT EXISTS games_title_bn_idx ON games ((title ->> 'bn'));

CREATE TABLE IF NOT EXISTS game_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  metadata_snapshot jsonb NOT NULL,
  entry_path text NOT NULL,
  content_hash char(64) NOT NULL,
  created_by uuid NOT NULL REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, revision_number)
);
ALTER TABLE games
  ADD CONSTRAINT games_active_revision_fk
  FOREIGN KEY (active_revision_id) REFERENCES game_revisions(id);
CREATE INDEX IF NOT EXISTS game_revisions_game_idx
  ON game_revisions (game_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_events_created_idx
  ON admin_audit_events (created_at DESC);

CREATE TABLE IF NOT EXISTS daily_analytics_aggregates (
  event_date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('game_view', 'game_launch', 'favorite')),
  game_slug text NOT NULL DEFAULT '',
  event_count bigint NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  PRIMARY KEY (event_date, event_type, game_slug)
);
CREATE INDEX IF NOT EXISTS daily_analytics_retention_idx
  ON daily_analytics_aggregates (event_date);

CREATE OR REPLACE FUNCTION prevent_revision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'published game revisions are immutable';
END;
$$;
DROP TRIGGER IF EXISTS game_revisions_immutable ON game_revisions;
CREATE TRIGGER game_revisions_immutable
  BEFORE UPDATE OR DELETE ON game_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_revision_mutation();

CREATE OR REPLACE FUNCTION set_game_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS games_updated_at ON games;
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_game_updated_at();
