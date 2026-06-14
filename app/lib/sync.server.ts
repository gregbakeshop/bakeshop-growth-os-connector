import prisma from "../db.server";

// Shopify data sync — reads via the GraphQL Admin API and lands raw JSON nodes
// into the Raw* tables. V1 uses cursor pagination for all entities (simple,
// robust, easy to verify). Orders can move to the Bulk Operations API later if
// a store's volume makes pagination too slow — the landing contract is the same.
//
// `admin` is the GraphQL client from authenticate.admin(request) (Sync now) or
// unauthenticated.admin(shop).admin (cron). Both expose .graphql(query, opts).

type GraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

const PAGE_SIZE = 100;
const MAX_PAGES = 500; // safety cap: 50k records/entity per run

type EntityConfig = {
  /** GraphQL root connection field, e.g. "orders". */
  field: string;
  /** Selection set for a single node (must include `id`). */
  nodeFields: string;
  /** Prisma delegate used to upsert landed rows. */
  upsert: (id: string, shop: string, data: string) => Promise<unknown>;
};

const ENTITIES: EntityConfig[] = [
  {
    field: "orders",
    nodeFields: `
      id
      name
      createdAt
      updatedAt
      processedAt
      displayFinancialStatus
      displayFulfillmentStatus
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      subtotalPriceSet { shopMoney { amount currencyCode } }
      totalDiscountsSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } }
      customer { id }
      discountCodes
      lineItems(first: 50) {
        edges { node {
          id title quantity
          discountedTotalSet { shopMoney { amount } }
          product { id }
          variant { id sku }
        } }
      }
      refunds { id createdAt totalRefundedSet { shopMoney { amount } } }
    `,
    upsert: (id, shop, data) =>
      prisma.rawShopifyOrder.upsert({
        where: { id },
        create: { id, shop, data },
        update: { shop, data },
      }),
  },
  {
    field: "products",
    nodeFields: `
      id
      title
      handle
      productType
      vendor
      status
      createdAt
      updatedAt
      totalInventory
      variants(first: 50) {
        edges { node { id title sku price inventoryQuantity } }
      }
    `,
    upsert: (id, shop, data) =>
      prisma.rawShopifyProduct.upsert({
        where: { id },
        create: { id, shop, data },
        update: { shop, data },
      }),
  },
  {
    field: "discountNodes",
    nodeFields: `
      id
      discount {
        __typename
        ... on DiscountCodeBasic {
          title status startsAt endsAt
          codes(first: 5) { edges { node { code } } }
          summary
        }
        ... on DiscountAutomaticBasic { title status startsAt endsAt summary }
        ... on DiscountCodeBxgy { title status startsAt endsAt }
        ... on DiscountAutomaticBxgy { title status startsAt endsAt }
      }
    `,
    upsert: (id, shop, data) =>
      prisma.rawShopifyDiscount.upsert({
        where: { id },
        create: { id, shop, data },
        update: { shop, data },
      }),
  },
];

function buildQuery(entity: EntityConfig): string {
  return `#graphql
    query Sync($first: Int!, $after: String) {
      ${entity.field}(first: $first, after: $after) {
        edges { cursor node { ${entity.nodeFields} } }
        pageInfo { hasNextPage endCursor }
      }
    }`;
}

type Connection = {
  edges: { cursor: string; node: { id: string } & Record<string, unknown> }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

async function syncEntity(
  admin: GraphqlClient,
  shop: string,
  entity: EntityConfig,
): Promise<number> {
  const query = buildQuery(entity);
  let after: string | null = null;
  let pages = 0;
  let count = 0;

  do {
    const response = await admin.graphql(query, {
      variables: { first: PAGE_SIZE, after },
    });
    const body = (await response.json()) as {
      data?: Record<string, Connection>;
      errors?: unknown;
    };
    if (body.errors) {
      throw new Error(
        `GraphQL error syncing ${entity.field}: ${JSON.stringify(body.errors)}`,
      );
    }
    const connection = body.data?.[entity.field];
    if (!connection) break;

    for (const edge of connection.edges) {
      await entity.upsert(edge.node.id, shop, JSON.stringify(edge.node));
      count += 1;
    }

    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    pages += 1;
  } while (after && pages < MAX_PAGES);

  return count;
}

export type SyncResult = {
  ok: boolean;
  counts: Record<string, number>;
  error?: string;
};

// Sync all entities for one shop. Marks the installation row syncing → idle/error.
export async function syncShop(
  admin: GraphqlClient,
  shop: string,
): Promise<SyncResult> {
  await prisma.shopifyInstallation.upsert({
    where: { shop },
    create: { shop, syncStatus: "syncing" },
    update: { syncStatus: "syncing", errorMessage: null },
  });

  const counts: Record<string, number> = {};
  try {
    for (const entity of ENTITIES) {
      counts[entity.field] = await syncEntity(admin, shop, entity);
    }
    await prisma.shopifyInstallation.update({
      where: { shop },
      data: { syncStatus: "idle", lastSyncAt: new Date(), errorMessage: null },
    });
    return { ok: true, counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.shopifyInstallation.update({
      where: { shop },
      data: { syncStatus: "error", errorMessage: message },
    });
    return { ok: false, counts, error: message };
  }
}
