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

## Current Hostinger setup
- Runtime URL: `http://187.127.153.47`
- Process manager: `systemd`
- Public entrypoint: `nginx` on port `80`
- App process: `/var/www/bakery_ecom/current/server.js`
- Native production dependencies are installed on the VPS during each release activation with `npm ci --omit=dev`
- Production env is intended to be rendered by GitHub Actions and installed at `/etc/bakery_ecom/bakery_ecom.env`

## TLS note
- IP-only deployments stay on HTTP.
- Let’s Encrypt cannot issue a normal certificate for a bare IP address.
- Add HTTPS only after a real domain or subdomain points to the VPS.

## GitHub Actions secrets
- Deploy transport: `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, optional `VPS_KNOWN_HOSTS`
- Runtime secrets: `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`
- Store these as repository-level Actions secrets at `Settings -> Secrets and variables -> Actions`
- Stable non-sensitive runtime values are pinned in the workflow and GitHub Actions secrets remain the source of truth for deploy auth plus sensitive app config

## Backups
- Run `scripts/backup.sh` daily.
- Run `scripts/prune-backups.sh` after backup completion.
- Run `scripts/prune-releases.sh` after successful deploys.
- Same-host backups are operational recovery only, not disaster recovery.

## Restore
1. Stop the service: `systemctl stop bakery_ecom`
2. Run `scripts/restore.sh <db-backup> <uploads-backup>`
3. Start the service: `systemctl start bakery_ecom`
4. Verify `http://187.127.153.47/api/health`
