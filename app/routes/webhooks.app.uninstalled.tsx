import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhooks can fire multiple times and after the app is already gone.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Mark disconnected so the scheduler stops syncing this shop. We keep the
  // installation row (and any landed data) until a shop/redact request.
  await db.shopifyInstallation.updateMany({
    where: { shop },
    data: { uninstalledAt: new Date(), syncStatus: "idle" },
  });

  return new Response();
};
