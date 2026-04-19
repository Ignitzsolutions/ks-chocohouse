# Risk Prevention and Recovery Runbook

This document is the operational handoff for `bakery_ecom`. It explains how production data is stored, what protections already exist, how backups and restores work, and what to do if the system ever fails or data must be recovered.

## Production data model

The application uses persistent paths outside the release directory. This is the core protection against data loss during normal deploys and service restarts.

- SQLite database: `/var/lib/bakery_ecom/bakery.sqlite`
- Uploads: `/var/lib/bakery_ecom/uploads`
- Immutable app releases: `/var/www/bakery_ecom/releases/<release-id>`
- Active app symlink: `/var/www/bakery_ecom/current`
- Production env file: `/etc/bakery_ecom/bakery_ecom.env`
- Backups: `/var/backups/bakery_ecom`

Business data must never be stored inside `/var/www/bakery_ecom/releases` or `/var/www/bakery_ecom/current`. Releases are disposable. `/var/lib/bakery_ecom` is the source of operational truth.

## Existing backend reliability protections

The production system already includes the following safeguards:

- SQLite runs in `WAL` mode, which improves crash and restart safety.
- The database file is stored outside the release directory on persistent disk.
- Uploaded files are stored outside the release directory on persistent disk.
- Release-based deployment uses immutable release folders with a `current` symlink.
- Runtime validation runs before the app starts under `systemd`.
- The app exposes `/api/health` for service health checks.
- Invoice runtime validation checks template and browser runtime readiness.
- The app runs behind `nginx`, which is the stable public entrypoint.
- Service logs are written to `journald` through `systemd`.
- Backup sets include metadata and checksum files.
- Restore verification support exists through `scripts/verify-restore.sh`.
- Release pruning is intended to preserve active and recent rollback-safe releases.

## Restart safety

Normal app restarts should not lose committed data.

Why:

- SQLite lives at `/var/lib/bakery_ecom/bakery.sqlite`
- uploads live at `/var/lib/bakery_ecom/uploads`
- restarts affect the app process, not the persistent storage location
- `WAL` mode protects committed transactions better than a basic rollback journal setup

This means normal operations like:

- `systemctl restart bakery_ecom`
- app crash and restart
- new release activation

should not remove already committed sales records or uploads, assuming the VPS disk itself remains healthy.

## What backups include

Each backup set is created under:

- `/var/backups/bakery_ecom/sets/<timestamp>`

Each set should include:

- `bakery.sqlite`
- `uploads.tar.gz`
- `app-journal.log.gz`
- `nginx-logs.tar.gz`
- `metadata.env`
- `SHA256SUMS`

These files cover:

1. Sales and application data in SQLite
2. Uploaded product and customer-related files
3. App service logs from `journald`
4. Nginx access/error logs
5. Recovery metadata and integrity verification

## Backup schedule and retention

Client-safe operational defaults:

- nightly local backup is required
- weekly offsite sync is required
- monthly restore drill is required on non-production

Default retention:

- 14 daily backup sets
- 8 weekly backup sets
- 3 monthly backup sets

Data recovery priority:

1. database
2. uploads
3. logs

## Offsite backup requirement

Same-host backups are useful for operational recovery, but they are not enough for client-safe protection.

If the VPS is lost, corrupted, deleted, or the disk fails, same-host backups are lost too. Because sales data is business-critical, offsite backup is required.

Recommended offsite targets:

- Cloudflare R2
- Backblaze B2
- AWS S3
- any S3-compatible object storage

Offsite upload should use the latest backup set from `/var/backups/bakery_ecom/latest`.

Credentials for offsite backup must never be committed to the repo. They should live only in:

- `/etc/bakery_ecom/bakery_ecom.env`, or
- a root-owned backup-specific config on the VPS

## Restore procedure

When data recovery is required:

1. Stop the service:

   ```bash
   systemctl stop bakery_ecom
   ```

2. Restore the selected backup set:

   ```bash
   /var/www/bakery_ecom/current/scripts/restore.sh /var/backups/bakery_ecom/sets/<timestamp> --restore-logs-to /var/backups/bakery_ecom/restored-logs/<timestamp>
   ```

3. Start the service:

   ```bash
   systemctl start bakery_ecom
   ```

4. Run restore verification:

   ```bash
   /var/www/bakery_ecom/current/scripts/verify-restore.sh
   ```

## Required verification after restore

After every restore, verify all of the following:

- `/api/health` returns healthy
- storefront page loads
- admin login page loads
- expected recent order count exists in SQLite
- invoice PDF generation works
- a sample uploaded image can be retrieved

Recommended manual checks:

- open the storefront
- open admin order history
- confirm a known recent order is present
- open or download one invoice

## What to restore first in an incident

If the system goes bad, restore in this order:

1. SQLite database
2. uploads
3. app service
4. logs if needed for investigation

Reason:

- without the database, sales/order state is lost
- without uploads, media and related assets may break
- logs help explain what happened, but they are secondary to customer data recovery

## Common failure scenarios

### 1. App restart or crash

Expected effect:

- no committed sales data loss

Action:

- restart service
- verify `/api/health`

### 2. Bad deployment

Expected effect:

- app may fail, but data should still remain under `/var/lib/bakery_ecom`

Action:

- repoint `current` to a known-good release
- restart service
- verify storefront, admin, health, invoice flow

### 3. Accidental data deletion or corruption

Expected effect:

- one or more tables or uploads may be missing or damaged

Action:

- stop service
- restore latest good backup set
- verify orders, uploads, invoice flow

### 4. VPS disk failure or server loss

Expected effect:

- local data and local backups may both be lost

Action:

- provision a new server
- restore from offsite backup
- restore env and release
- verify full app behavior

## Release safety guidance

To protect business continuity:

- never store business data inside release folders
- never prune the active release
- keep multiple known-good releases
- protect recent releases during rollback windows
- do not prune aggressively immediately after deploy

## Client handoff expectations

For client-safe operation, the following must be treated as required, not optional:

- nightly local backups
- weekly offsite backups
- monthly restore drill
- restore verification after any restore
- preservation of persistent data outside the release directory

Without offsite backup, the system is operationally recoverable only for small incidents, not disaster-recovery safe.
