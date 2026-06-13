# Bakeshop Growth OS Connector

A thin Shopify **public app** that connects a client store's read-only commerce
data to Bakeshop Digital's private Growth OS analytics workspace. It does four
things and nothing else:

1. Client installs it
2. Client approves read-only Shopify access
3. App stores the access token (AES-256-GCM encrypted)
4. App syncs read-only Shopify data into a local warehouse

Charts and reporting live **outside** Shopify (in inbox-analytics / the future
analytics layer). This app is just a connector.

## Stack

- **Remix + TypeScript** (Shopify CLI Remix template / `@shopify/shopify-app-remix` v4)
- **SQLite via Prisma** (migrate to Postgres only on write contention)
- **Polaris + App Bridge** embedded admin UI (one status screen)
- **node-cron** in-process daily sync (04:00 UTC)

## What it syncs

Via the **GraphQL Admin API**, into raw JSON tables (`RawShopify*`):
orders, products, customers, discounts. Scopes: `read_orders, read_products,
read_customers, read_discounts`.

## Local development

```bash
npm install
cp .env.example .env          # fill in values; generate TOKEN_ENCRYPTION_KEY
npm run setup                 # prisma generate + migrate
npm run dev                   # shopify app dev (interactive Partner login)
```

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Key files

| Path | Purpose |
|------|---------|
| `app/shopify.server.ts` | Shopify app config, scopes, encrypted session storage |
| `app/lib/crypto.server.ts` | AES-256-GCM encrypt/decrypt for tokens |
| `app/lib/encrypted-session-storage.server.ts` | Wraps PrismaSessionStorage to encrypt tokens at rest |
| `app/lib/sync.server.ts` | GraphQL sync engine (cursor pagination → raw tables) |
| `app/cron.server.ts` | In-process daily sync scheduler |
| `app/routes/app._index.tsx` | Embedded status screen + Sync now |
| `app/routes/webhooks.*.tsx` | uninstall + GDPR compliance webhooks |
| `app/routes/{privacy,terms,support}.tsx` | Public legal/support pages |
| `prisma/schema.prisma` | DB schema |

## Deploy

See [`docs/deploy.md`](docs/deploy.md). Same DO droplet as inbox-analytics, behind
Caddy at `connector.bakeshop.digital`, systemd on port 3001. **Single instance only**
(in-process cron).

## Design

See [`docs/superpowers/specs/2026-06-13-shopify-connector-design.md`](docs/superpowers/specs/2026-06-13-shopify-connector-design.md).
