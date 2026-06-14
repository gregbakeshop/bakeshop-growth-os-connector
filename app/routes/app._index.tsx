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
  const [orders, products, discounts] = await Promise.all([
    prisma.rawShopifyOrder.count({ where: { shop } }),
    prisma.rawShopifyProduct.count({ where: { shop } }),
    prisma.rawShopifyDiscount.count({ where: { shop } }),
  ]);

  return {
    shop,
    lastSyncAt: installation.lastSyncAt?.toISOString() ?? null,
    syncStatus: installation.syncStatus,
    errorMessage: installation.errorMessage,
    counts: { orders, products, discounts },
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

export default function Index() {
  const { shop, lastSyncAt, syncStatus, errorMessage, counts } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // Prefer fresh counts from a just-completed sync, else the loader snapshot.
  const liveCounts =
    fetcher.data?.ok && fetcher.data.counts
      ? {
          orders: fetcher.data.counts.orders ?? counts.orders,
          products: fetcher.data.counts.products ?? counts.products,
          discounts: fetcher.data.counts.discountNodes ?? counts.discounts,
        }
      : counts;

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
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="100">
                        <Text as="span" variant="headingLg">
                          {formatCount(liveCounts.orders)}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Orders
                        </Text>
                      </BlockStack>
                    </Card>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="100">
                        <Text as="span" variant="headingLg">
                          {formatCount(liveCounts.products)}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Products
                        </Text>
                      </BlockStack>
                    </Card>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="100">
                        <Text as="span" variant="headingLg">
                          {formatCount(liveCounts.discounts)}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Discounts
                        </Text>
                      </BlockStack>
                    </Card>
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
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  About
                </Text>
                <Text as="p" variant="bodyMd">
                  This app connects your store&apos;s read-only commerce data to
                  your private Bakeshop analytics workspace. Reporting
                  and insights live in Bakeshop, not in this app.
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
