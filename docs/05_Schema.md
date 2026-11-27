# 05 — Database Schema Proposal

PostgreSQL proposed. Exact DDL and migrations require implementation review. API authorization is mandatory; RLS is optional defense-in-depth only if fully specified and tested.

## Tables
**admin_users**: id UUID PK, normalized email unique, password_hash, display_name, status, created_at, updated_at, last_login_at.
**admin_sessions**: id UUID PK, admin_user_id FK, session_token_hash unique (never raw token), created_at, expires_at, revoked_at.
**categories**: id UUID PK, name, slug unique, description nullable, sort_order, is_active, timestamps.
**games**: id UUID PK, slug unique, title, short_description, description, instructions nullable, category_id FK, status, thumbnail_asset_id nullable FK, active_revision_id nullable FK, created_at, updated_at, published_at.
**game_revisions**: id UUID PK, game_id FK, revision_number, asset_manifest JSONB, entry_path, content_hash, status, created_by FK, created_at, published_at; unique(game_id, revision_number); published revisions immutable.
**game_assets**: id UUID PK, game_id FK, revision_id nullable FK, object_key unique, sanitized filename, mime_type, size_bytes, sha256, asset_role, created_at.
**admin_audit_events**: id UUID PK, admin_user_id nullable FK, action, target_type, target_id nullable, redacted metadata JSONB, created_at.
**analytics_events** (if PostgreSQL used): id UUID PK, event_type, game_id nullable, coarse properties, event_time. No persistent visitor ID, fingerprint or raw IP retention.
**daily_analytics_aggregates**: date, game_id nullable, event_type, count; 365-day retention, approved in the owner's Phase 0 decision reconciliation.

## Indexes
Unique normalized admin email; session token hash/expiry; game slug/status/category/published_at; category slug/active/sort; revision `(game_id, revision_number)`; asset object_key/hash/game; audit timestamp/target/admin; analytics time/game/event type.

## Relationships
Category 1:N games; game 1:N revisions/assets; game references active revision; audit events reference admin. Define explicit archive/delete behavior and FK constraints.

## Contact
No app DB table for contact message body or attachments. Provider-side retention must be disclosed. Logs must exclude message content.

## Access/migrations
Migration credential separate from restricted API runtime DB role. Backups and restore tests required. Never enable RLS without tested policies.
