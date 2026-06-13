# Bakeshop Growth OS Connector — Design

**Date:** 2026-06-13
**Status:** Approved
**Deciders:** Greg Boudenkov, Claude

---

## Mission

A thin Shopify **public app** that does exactly four things:

1. Client installs it
2. Client approves read-only Shopify access
3. App stores the access token (encrypted)
4. App syncs read-only Shopify data into a local warehouse

Everything else (charts, analysis, reporting) lives outside Shopify, in
inbox-analytics or a future analytics layer. The Shopify app is *just a connector*.

This replaces the per-account pain that ADR-028 (inbox-analytics) worked around by
scraping PowerMyAnalytics KPI Google Sheets. Once a store installs this connector,
OAuth owns the token and we read Shopify directly.

---

## System overview

Two repos, one droplet:

```
bakeshop-growth-os-connector/   (new repo — this project)
├── Remix + TypeScript (Shopify CLI scaffold)
├── SQLite via Prisma (default — zero setup; migrate to Postgres only on contention)
├── Port 3001; Caddy proxies connector.bakeshop.digital → localhost:3001
└── Legal pages /privacy /terms /support served as static routes

inbox-analytics/   (existing repo — unchanged for now)
└── Eventually reads the connector's DB for a Shopify data tab
```

**Install flow:**
1. Client installs from Shopify App Store (or `connector.bakeshop.digital`)
2. Shopify OAuth → access token stored AES-256-GCM encrypted in DB
3. Embedded admin UI loads — shows sync status + "Sync now" button
4. `node-cron` daily sync (04:00 UTC) pulls GraphQL data into raw tables

---

## Stack decision

**Shopify CLI Remix scaffold** (`npm init @shopify/app@latest`, Remix template, TypeScript).
The CLI handles OAuth, session tokens, HMAC verification, CSP headers, and App Bridge
embedding out of the box — the hardest parts of Shopify app development. The embedded UI
is trivial (one status page + a button), so Remix overhead is negligible, and reviewers
know this stack.

**SQLite via Prisma** (CLI default) for fastest deploy — zero new database service, one
file on the droplet, same operational profile as inbox-analytics. Migrate to Postgres only
if write contention appears (not expected at 17–50 stores).

---

## Database schema (Prisma)

Shopify CLI auto-generates the `Session` table. We add four models:

```prisma
model ShopifyInstallation {
  id            String    @id @default(cuid())
  shop          String    @unique   // "client-store.myshopify.com"
  installedAt   DateTime  @default(now())
  uninstalledAt DateTime?
  lastSyncAt    DateTime?
  syncStatus    String?             // "idle" | "syncing" | "error"
  errorMessage  String?
}

model RawShopifyOrder {
  id       String   @id            // Shopify GID
  shop     String
  data     String                  // JSON blob — full GraphQL node
  syncedAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([shop])
}

model RawShopifyProduct  { id String @id  shop String  data String  syncedAt DateTime @default(now())  updatedAt DateTime @updatedAt  @@index([shop]) }
model RawShopifyCustomer { id String @id  shop String  data String  syncedAt DateTime @default(now())  updatedAt DateTime @updatedAt  @@index([shop]) }
model RawShopifyDiscount { id String @id  shop String  data String  syncedAt DateTime @default(now())  updatedAt DateTime @updatedAt  @@index([shop]) }
```

**Raw JSON blobs**, not normalized columns — lets us land data immediately and normalize
downstream without a migration every time Shopify adds a field. Refund and fulfillment data
ride inside the order payload.

---

## OAuth scopes

`read_orders`, `read_products`, `read_customers`, `read_discounts`.

Covers the end-goal analytics (revenue, AOV, new-vs-returning split, promo performance).
Dropping `read_inventory` / `read_fulfillments` / `read_locations` / `read_marketing_events`
from V1 — fewer scopes = faster review; fulfillment/refund data rides in the order payload.

`read_customers` triggers Shopify's **protected customer data** review (slower). We accept
this because new/returning is core to the end goal, and we **pilot with merchant-created
custom-app tokens while review runs** (build order step 15) — so review latency never blocks
the data system.

---

## Token encryption

Shopify CLI's default Prisma session storage writes the access token in **plaintext**. We
wrap it in a thin custom `SessionStorage` adapter that AES-256-GCM-encrypts the `accessToken`
field at rest, key from `TOKEN_ENCRYPTION_KEY`. Same principle as inbox-analytics' Fernet
(ADR-012). Never store Shopify tokens in plaintext.

---

## Sync engine

- **Manual:** "Sync now" button → Remix action → runs the sync for the current shop.
- **Scheduled:** in-process `node-cron`, daily 04:00 UTC (offset from inbox-analytics' 03:00).
  Single instance, so in-process is fine (same reasoning as APScheduler / ADR-011).
- **Method:** Shopify **Bulk Operations API** for orders (high volume); standard paginated
  GraphQL for products / customers / discounts. Upsert raw JSON keyed by GID.
- **Status:** `ShopifyInstallation.syncStatus` + `lastSyncAt` drive the UI.
- **GraphQL Admin API only** — REST is legacy per Shopify.

---

## Webhooks

Declared in `shopify.app.toml`, handlers in `app/routes/webhooks.*.tsx`:

- `app/uninstalled` — set `uninstalledAt`, stop syncing, mark disconnected.
- `customers/data_request` — compliance: log the request.
- `customers/redact` — compliance: delete that customer's rows for the shop.
- `shop/redact` — compliance: delete all raw rows for the shop.

---

## Embedded admin UI

One screen. No charts.

```
Bakeshop Growth OS Connector
Status: Connected
Store: client-store.myshopify.com
Last sync: June 13, 2026, 10:42 AM
Synced: Orders · Customers · Products · Discounts
[ Sync now ]
Support: support@bakeshop.digital
```

---

## Deploy

- `npm run build` → standalone → **systemd service on port 3001**.
- Caddy block: `connector.bakeshop.digital → localhost:3001`.
- DNS A record for the `connector` subdomain → droplet IP.
- Env: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SCOPES`,
  `TOKEN_ENCRYPTION_KEY`, `DATABASE_URL`.
- Legal pages `/privacy` `/terms` `/support` as static Remix routes.

---

## Build order

1. Scaffold Shopify app (Remix/TS)
2. Prisma schema: installation + raw tables
3. Encrypted token storage adapter
4. Connected status screen
5. "Sync now" button (action)
6. GraphQL orders sync (Bulk Operations)
7. Products / customers / discounts sync
8. `app/uninstalled` webhook
9. Privacy webhooks (data_request / redact / shop_redact)
10. Legal/support pages
11. node-cron daily sync
12. Deploy (systemd + Caddy + DNS)
13. Test on dev store
14. Record demo + submit for review
15. Pilot with custom-app tokens while review runs

---

## Out of scope (V1)

- Charts / reporting inside Shopify (lives in inbox-analytics).
- Normalized warehouse modeling — raw JSON only for now.
- Postgres — SQLite until contention.
- Real-time order webhooks — daily + manual sync only; add later.
- Billing — free connector for Bakeshop clients.
