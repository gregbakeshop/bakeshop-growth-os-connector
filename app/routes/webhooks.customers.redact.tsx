import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// GDPR: erase a specific customer's data. Shopify sends the customer GID and the
// order IDs to redact. We delete the raw customer row and any raw orders called
// out in the payload for this shop.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop}`);

  const body = payload as {
    customer?: { id?: number | string };
    orders_to_redact?: (number | string)[];
  };

  const customerGid = body.customer?.id
    ? `gid://shopify/Customer/${body.customer.id}`
    : null;
  if (customerGid) {
    await db.rawShopifyCustomer.deleteMany({
      where: { shop, id: customerGid },
    });
  }

  const orderGids = (body.orders_to_redact ?? []).map(
    (id) => `gid://shopify/Order/${id}`,
  );
  if (orderGids.length > 0) {
    await db.rawShopifyOrder.deleteMany({
      where: { shop, id: { in: orderGids } },
    });
  }

  return new Response();
};
