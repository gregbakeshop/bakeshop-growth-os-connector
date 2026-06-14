import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  InlineGrid,
  Badge,
  List,
  Link,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { syncShop } from "../lib/sync.server";

const SUPPORT_EMAIL = "hello@bakeshop.digital";

// Above this many orders we skip the in-loader JSON parse to keep the page fast,
// and fall back to showing synced-record counts only.
const INSIGHTS_ORDER_CAP = 25000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Insights = {
  currency: string;
  revenue30: number;
  revenueDelta: number | null;
  orders30: number;
  ordersDelta: number | null;
  aov: number;
  topProducts: { title: string; revenue: number }[];
};

// Compute a 30-day summary from the raw order JSON blobs. Pure + bounded.
function computeInsights(blobs: string[]): Insights | null {
  const now = Date.now();
  const cut30 = now - 30 * DAY_MS;
  const cut60 = now - 60 * DAY_MS;

  let revenue30 = 0;
  let revenuePrev = 0;
  let orders30 = 0;
  let ordersPrev = 0;
  let currency = "USD";
  const productRev = new Map<string, number>();

  for (const blob of blobs) {
    let o: any;
    try {
      o = JSON.parse(blob);
    } catch {
      continue;
    }
    const created = o.createdAt ? Date.parse(o.createdAt) : NaN;
    if (Number.isNaN(created)) continue;

    const money = o.currentTotalPriceSet?.shopMoney;
    const amount = money ? parseFloat(money.amount) || 0 : 0;
    if (money?.currencyCode) currency = money.currencyCode;

    if (created >= cut30) {
      revenue30 += amount;
      orders30 += 1;
      const items = o.lineItems?.edges ?? [];
      for (const edge of items) {
        const title = edge?.node?.title ?? "Unknown product";
        const lineRev =
          parseFloat(edge?.node?.discountedTotalSet?.shopMoney?.amount) || 0;
        productRev.set(title, (productRev.get(title) ?? 0) + lineRev);
      }
    } else if (created >= cut60) {
      revenuePrev += amount;
      ordersPrev += 1;
    }
  }

  if (orders30 === 0 && ordersPrev === 0) return null;

  const topProducts = [...productRev.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, revenue]) => ({ title, revenue }));

  const pct = (cur: number, prev: number): number | null =>
    prev > 0 ? ((cur - prev) / prev) * 100 : null;

  return {
    currency,
    revenue30,
    revenueDelta: pct(revenue30, revenuePrev),
    orders30,
    ordersDelta: pct(orders30, ordersPrev),
    aov: orders30 > 0 ? revenue30 / orders30 : 0,
    topProducts,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Ensure an installation row exists (first embedded load after install).
  const installation = await prisma.shopifyInstallation.upsert({
    where: { shop },
    create: { shop, syncStatus: "idle" },
    update: { uninstalledAt: null },
  });

  // Cheap COUNTs over the indexed `shop` column — proof the sync is landing data.
  const [orderCount, products, discounts] = await Promise.all([
    prisma.rawShopifyOrder.count({ where: { shop } }),
    prisma.rawShopifyProduct.count({ where: { shop } }),
    prisma.rawShopifyDiscount.count({ where: { shop } }),
  ]);

  // 30-day insights, parsed from synced order JSON (bounded for performance).
  let insights: Insights | null = null;
  if (orderCount > 0 && orderCount <= INSIGHTS_ORDER_CAP) {
    const rows = await prisma.rawShopifyOrder.findMany({
      where: { shop },
      select: { data: true },
    });
    insights = computeInsights(rows.map((r) => r.data));
  }

  return {
    shop,
    lastSyncAt: installation.lastSyncAt?.toISOString() ?? null,
    syncStatus: installation.syncStatus,
    errorMessage: installation.errorMessage,
    counts: { orders: orderCount, products, discounts },
    insights,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const result = await syncShop(admin, session.shop);
  return result;
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function formatMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
  }
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const rounded = Math.round(delta);
  if (rounded === 0) return <Badge tone="info">No change</Badge>;
  const up = rounded > 0;
  return (
    <Badge tone={up ? "success" : "critical"}>
      {`${up ? "▲" : "▼"} ${Math.abs(rounded)}% vs prior 30d`}
    </Badge>
  );
}

function StatTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <Card background="bg-surface-secondary">
      <BlockStack gap="100">
        <Text as="span" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="span" variant="headingLg">
          {value}
        </Text>
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </BlockStack>
    </Card>
  );
}

export default function Index() {
  const { shop, lastSyncAt, syncStatus, errorMessage, counts, insights } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSyncing =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Sync complete");
    } else if (fetcher.data && !fetcher.data.ok) {
      shopify.toast.show("Sync failed", { isError: true });
    }
  }, [fetcher.data, shopify]);

  const sync = () => fetcher.submit({}, { method: "POST" });

  const connected = !errorMessage && syncStatus !== "error";
  const lastSyncDisplay =
    fetcher.data?.ok && fetcher.data.counts
      ? "Just now"
      : formatTimestamp(lastSyncAt);

  return (
    <Page>
      <TitleBar title="Bakeshop OS" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* ── Last 30 days ───────────────────────────────── */}
              {insights && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Last 30 days
                    </Text>
                    <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
                      <StatTile
                        label="Revenue"
                        value={formatMoney(insights.revenue30, insights.currency)}
                        delta={insights.revenueDelta}
                      />
                      <StatTile
                        label="Orders"
                        value={formatCount(insights.orders30)}
                        delta={insights.ordersDelta}
                      />
                      <StatTile
                        label="Avg order value"
                        value={formatMoney(insights.aov, insights.currency)}
                      />
                    </InlineGrid>

                    {insights.topProducts.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="span" variant="bodyMd" tone="subdued">
                          Top products by revenue
                        </Text>
                        <BlockStack gap="100">
                          {insights.topProducts.map((p) => (
                            <InlineStack key={p.title} align="space-between">
                              <Text as="span" variant="bodyMd">
                                {p.title}
                              </Text>
                              <Text as="span" variant="bodyMd" tone="subdued">
                                {formatMoney(p.revenue, insights.currency)}
                              </Text>
                            </InlineStack>
                          ))}
                        </BlockStack>
                      </BlockStack>
                    )}

                    <Text as="span" variant="bodySm" tone="subdued">
                      Full reporting lives in your Bakeshop analytics workspace.
                    </Text>
                  </BlockStack>
                </Card>
              )}

              {/* ── Connection ─────────────────────────────────── */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Connection
                    </Text>
                    {connected ? (
                      <Badge tone="success">Connected</Badge>
                    ) : (
                      <Badge tone="critical">Error</Badge>
                    )}
                  </InlineStack>

                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Store
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {shop}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Last sync
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {lastSyncDisplay}
                      </Text>
                    </InlineStack>
                  </BlockStack>

                  <BlockStack gap="200">
                    <Text as="span" variant="bodyMd" tone="subdued">
                      Synced to your Bakeshop workspace
                    </Text>
                    <InlineGrid columns={3} gap="300">
                      <StatTile label="Orders" value={formatCount(counts.orders)} />
                      <StatTile
                        label="Products"
                        value={formatCount(counts.products)}
                      />
                      <StatTile
                        label="Discounts"
                        value={formatCount(counts.discounts)}
                      />
                    </InlineGrid>
                  </BlockStack>

                  {fetcher.data && !fetcher.data.ok && (
                    <Text as="p" variant="bodyMd" tone="critical">
                      {fetcher.data.error}
                    </Text>
                  )}
                  {!fetcher.data && errorMessage && (
                    <Text as="p" variant="bodyMd" tone="critical">
                      Last sync error: {errorMessage}
                    </Text>
                  )}

                  <InlineStack>
                    <Button variant="primary" loading={isSyncing} onClick={sync}>
                      Sync now
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  About
                </Text>
                <Text as="p" variant="bodyMd">
                  This app connects your store&apos;s read-only commerce data to
                  your private Bakeshop analytics workspace. The summary above is
                  a snapshot — full reporting and insights live in Bakeshop.
                </Text>
                <List>
                  <List.Item>Read-only access</List.Item>
                  <List.Item>Daily automatic sync</List.Item>
                  <List.Item>Manual sync on demand</List.Item>
                </List>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Support:{" "}
                  <Link url={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
