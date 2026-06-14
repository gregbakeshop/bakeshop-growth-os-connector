# Deploying Bakeshop OS Connector

Repo: `https://github.com/gregbakeshop/bakeshop-growth-os-connector`

Target: the existing DigitalOcean droplet (alongside inbox-analytics), behind Caddy,
at `https://connector.bakeshop.digital`. Single instance (in-process cron).

## 0. Prerequisites (one-time, in Shopify Partner Dashboard)

1. **Create the app** — Partners → Apps → Create app → **Public app**.
   Name: `Bakeshop Growth OS Connector`.
2. From the project, link config and push:
   ```bash
   npm run config:link        # writes client_id + application_url into shopify.app.toml
   npm run deploy             # pushes scopes + webhook subscriptions to Shopify
   ```
   Both require interactive Partner login (browser).

## 1. DNS

Add an A record: `connector.bakeshop.digital → <droplet IP>`.

## 2. Code + build on the droplet

```bash
cd /opt
git clone <repo-url> bakeshop-growth-os-connector
cd bakeshop-growth-os-connector
npm ci
cp .env.example .env          # then fill in real values (see below)
npm run setup                 # prisma generate + migrate deploy (creates SQLite DB)
npm run build                 # remix vite:build → ./build
```

### .env values

- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` — from the Partner app.
- `SHOPIFY_APP_URL=https://connector.bakeshop.digital`
- `TOKEN_ENCRYPTION_KEY` — generate once, **back it up separately from the DB**
  (lose it and stored tokens are unrecoverable):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- `DATABASE_URL="file:./prisma/dev.sqlite"` (or an absolute path under the app dir).

## 3. systemd service (port 3001)

`/etc/systemd/system/bgos-connector.service`:

```ini
[Unit]
Description=Bakeshop Growth OS Connector
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/bakeshop-growth-os-connector
EnvironmentFile=/opt/bakeshop-growth-os-connector/.env
Environment=PORT=3001
ExecStart=/usr/bin/npm run start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bgos-connector
sudo systemctl status bgos-connector
```

## 4. Caddy

Add to the Caddyfile:

```
connector.bakeshop.digital {
    reverse_proxy localhost:3001
}
```

```bash
sudo systemctl reload caddy
```

## 5. Verify

- Visit `https://connector.bakeshop.digital/privacy` (and `/terms`, `/support`) — public pages load.
- Install on a Shopify **dev store**, approve scopes, confirm the embedded status
  screen renders, click **Sync now**, confirm rows land in the DB:
  ```bash
  sqlite3 prisma/dev.sqlite "select shop,syncStatus,lastSyncAt from ShopifyInstallation;"
  sqlite3 prisma/dev.sqlite "select count(*) from RawShopifyOrder;"
  ```
- Uninstall; confirm `app/uninstalled` set `uninstalledAt` and syncing stopped.

## Notes

- **Single instance only** — the daily sync runs in-process (node-cron, 04:00 UTC).
  Do not run multiple replicas; that would double-sync.
- Migrating to Postgres later: change the `datasource` provider + `DATABASE_URL`,
  re-run migrations. Raw tables are JSON blobs, so no data reshaping needed.
- Orders sync uses cursor pagination (cap 50k/run). For very large stores, move the
  orders entity in `app/lib/sync.server.ts` to the Bulk Operations API.
