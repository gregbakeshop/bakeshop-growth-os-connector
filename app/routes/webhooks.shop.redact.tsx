import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// GDPR: 48h after a shop uninstalls, erase everything we hold for it.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop}`);

  await db.$transaction([
    db.rawShopifyOrder.deleteMany({ where: { shop } }),
    db.rawShopifyProduct.deleteMany({ where: { shop } }),
    db.rawShopifyCustomer.deleteMany({ where: { shop } }),
    db.rawShopifyDiscount.deleteMany({ where: { shop } }),
    db.session.deleteMany({ where: { shop } }),
    db.shopifyInstallation.deleteMany({ where: { shop } }),
  ]);

  return new Response();
};
