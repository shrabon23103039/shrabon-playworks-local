# Automated Neon PostgreSQL Backups (Free Tier)

**Workflow:** [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml)  
**Schedule:** Daily at `20:15 UTC` (`02:15 Asia/Dhaka`), plus manual `workflow_dispatch`.  
**Retention:** `7 days` as private GitHub Actions workflow artifacts (accessible only to repository collaborators with read/actions access).

---

## 1. GitHub Actions Secret Setup (Do Not Commit Secrets)

1. Open your **private** GitHub repository: `https://github.com/shrabon23103039/shrabon-playworks-local`.
2. Go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret**.
4. Name: `DATABASE_URL_UNPOOLED`
5. Value: Copy the `DATABASE_URL_UNPOOLED` value from your local `.env` (or from Neon Console → `shrabon-playworks-prod` → `production` branch → **Connection details** → uncheck **Connection pooling**).
6. Click **Add secret**.

> **Security:** The workflow parses `DATABASE_URL_UNPOOLED` inside a `0600` temporary environment file and never passes credentials on the `pg_dump` command line or prints them to logs.

---

## 2. Manual Restore Procedure (Separate Test Database Only)

**Never run `pg_restore` against your live `production` Neon database unless performing an approved disaster recovery on a fresh/restored branch.**

1. In GitHub, open **Actions → Neon PostgreSQL Daily Backup**, select a successful run, and download the `neon-playworks-backup-<run_id>` artifact (`.zip`), then extract `playworks-<timestamp>.dump`.
2. Create an isolated Neon branch (e.g., `restore-test`) or use a local PostgreSQL 18 test database:
   ```powershell
   createdb playworks_restore_test
   pg_restore --no-owner --no-acl --dbname=playworks_restore_test playworks-YYYYMMDDTHHMMSSZ.dump
   ```
3. Verify restored tables and row counts:
   ```powershell
   psql -d playworks_restore_test -c "\dt"
   psql -d playworks_restore_test -c "SELECT slug, status FROM games ORDER BY slug;"
   ```

---

## 3. Free-Tier Quota Notes
- **GitHub Free (private repo):** `2,000` Actions minutes/month & `500 MB` artifact storage. A daily `pg_dump` uses ~`30–60` minutes/month and `< 1 MB` for 7 days of artifacts.
- **Neon Free:** Each daily dump briefly wakes compute (~`3 CU-hours/month` out of `100 CU-hours/month`) and transfers `< 1 MB` egress/month (out of `5 GB/month`).
- **Note on scheduled workflows in GitHub:** GitHub only runs `schedule:` workflows from the repository's **default branch** (`main` unless changed or merged). Until `hosting-demo-prep` is merged into `main`, scheduled cron runs will not trigger automatically—only `workflow_dispatch` on `hosting-demo-prep` can be run manually once pushed.
