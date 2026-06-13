import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// GDPR: a merchant customer requested their stored data. This connector stores
// only raw aggregate commerce nodes for the agency's analytics — it surfaces no
// customer-facing data UI. We log the request for our compliance record; any
// data export is handled operationally by Bakeshop.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(
    `Received ${topic} for ${shop}: ${JSON.stringify(payload)}`,
  );
  return new Response();
};
