# Ubuntu 24.04 VPS deployment

## Directory layout
- `/var/www/bakery_ecom/releases/<release-id>` immutable releases
- `/var/www/bakery_ecom/current` active release symlink
- `/etc/bakery_ecom/bakery_ecom.env` production env file
- `/var/lib/bakery_ecom/bakery.sqlite` SQLite database
- `/var/lib/bakery_ecom/uploads` uploaded product images
- `/var/backups/bakery_ecom` backups

## Provisioning
1. Install packages: `nginx`, `sqlite3`, `nodejs`, `npm`, and a Chrome runtime.
2. Create a `bakery` user and group.
3. Copy `deploy/systemd/bakery_ecom.service` to `/etc/systemd/system/`.
4. Copy `deploy/nginx/bakery_ecom.conf` to `/etc/nginx/sites-available/`, replace `__APP_PORT__` and `__PUBLIC_UPLOADS_BASE_URL__`, and enable it.
5. Create `/etc/bakery_ecom/bakery_ecom.env` from `deploy/env/.env.production.example`.
6. Enable the service: `systemctl daemon-reload && systemctl enable --now bakery_ecom`.
7. Install `certbot` and the Nginx plugin, issue a certificate for `www.kschocohouse.com` and `kschocohouse.com`, then validate renewal.

## Current Hostinger setup
- Runtime URL: `https://www.kschocohouse.com`
- Process manager: `systemd`
- Public entrypoint: `nginx` on ports `80/443`
- App process: `/var/www/bakery_ecom/current/server.js`
- Native production dependencies are installed on the VPS during each release activation with `npm ci --omit=dev`
- Production env is intended to be rendered by GitHub Actions and installed at `/etc/bakery_ecom/bakery_ecom.env`
- Persistent business data must remain under `/var/lib/bakery_ecom`, never under `/var/www/bakery_ecom/releases`

## DNS and TLS
- Set the GoDaddy apex `A` record for `kschocohouse.com` to `187.127.153.47`.
- Keep `www` as `CNAME @`.
- Leave MX, TXT, DMARC, and unrelated subdomains unchanged.
- `kschocohouse.com` should redirect to `https://www.kschocohouse.com`.
- Use Let’s Encrypt contact email `kschocohouse@gmail.com`.

## GitHub Actions secrets
- Deploy transport: `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, optional `VPS_KNOWN_HOSTS`
- Runtime secrets: `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`
- Store these as repository-level Actions secrets at `Settings -> Secrets and variables -> Actions`
- Stable non-sensitive runtime values are pinned in the workflow and GitHub Actions secrets remain the source of truth for deploy auth plus sensitive app config

## Backups
- Nightly backup: `scripts/backup.sh`
- Weekly prune: `scripts/prune-backups.sh`
- Weekly offsite sync: `scripts/offsite-sync.sh`
- Restore verification: `scripts/verify-restore.sh`
- Same-host backups are operational recovery only, not disaster recovery.
- Recommended timers:
  - `bakery_ecom-backup.timer`
  - `bakery_ecom-backup-prune.timer`
  - `bakery_ecom-backup-offsite.timer`
  - `bakery_ecom-restore-verify.timer` on non-production only
- Each backup set includes:
  - SQLite hot backup
  - uploads archive
  - `journald` export for `bakery_ecom.service`
  - Nginx logs archive
  - metadata and checksums
- Default retention:
  - 14 daily sets
  - 8 weekly sets
  - 3 monthly sets

## Restore
1. Stop the service: `systemctl stop bakery_ecom`
2. Run `scripts/restore.sh /var/backups/bakery_ecom/sets/<timestamp> --restore-logs-to /var/backups/bakery_ecom/restored-logs/<timestamp>`
3. Start the service: `systemctl start bakery_ecom`
4. Verify `https://www.kschocohouse.com/api/health`
5. Run `scripts/verify-restore.sh`

## Release pruning
- `scripts/prune-releases.sh` must never prune the active release.
- Keep multiple known-good releases on disk.
- Releases newer than the minimum prune age are preserved to protect rollback during a verification window.
