import "../load-env.js";
import { closePool, getPool } from "../db.js";

try {
  const pool = getPool();
  const aggregates = await pool.query(
    "DELETE FROM daily_analytics_aggregates WHERE event_date < (now() AT TIME ZONE 'UTC')::date - 365",
  );
  const sessions = await pool.query(
    "DELETE FROM admin_sessions WHERE expires_at < now() - interval '30 days' OR revoked_at < now() - interval '30 days'",
  );
  console.log(`Deleted ${aggregates.rowCount ?? 0} expired aggregate rows and ${sessions.rowCount ?? 0} expired sessions`);
} finally {
  await closePool();
}
