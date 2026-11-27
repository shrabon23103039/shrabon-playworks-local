CREATE TABLE game_assets (
  id uuid PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  entry_path text NOT NULL,
  content_hash char(64) NOT NULL,
  compressed_size bigint NOT NULL CHECK (compressed_size BETWEEN 1 AND 15728640),
  expanded_size bigint NOT NULL CHECK (expanded_size BETWEEN 1 AND 52428800),
  file_count integer NOT NULL CHECK (file_count BETWEEN 2 AND 500),
  asset_manifest jsonb NOT NULL,
  status text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'published')),
  created_by uuid NOT NULL REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, id)
);
CREATE INDEX game_assets_game_status_idx ON game_assets (game_id, status);
ALTER TABLE game_revisions
  ADD COLUMN asset_id uuid REFERENCES game_assets(id);
