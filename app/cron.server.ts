import cron from "node-cron";
import prisma from "./db.server";
import shopify from "./shopify.server";
import { syncShop } from "./lib/sync.server";

// In-process daily sync. Single instance only (same constraint as the
// inbox-analytics APScheduler). Offset to 04:00 UTC so it doesn't collide with
// inbox-analytics' 03:00 nightly sync.
const SCHEDULE = process.env.SYNC_CRON || "0 4 * * *";

declare global {
  // eslint-disable-next-line no-var
  var __bgosCronStarted: boolean | undefined;
}

export async function runDailySync(): Promise<void> {
  const installs = await prisma.shopifyInstallation.findMany({
    where: { uninstalledAt: null },
  });
  console.log(`[cron] daily sync: ${installs.length} active shop(s)`);

  for (const install of installs) {
    try {
      const { admin } = await shopify.unauthenticated.admin(install.shop);
      const result = await syncShop(admin, install.shop);
      console.log(
        `[cron] ${install.shop}: ${result.ok ? "ok" : "error"} ${JSON.stringify(
          result.counts,
        )}`,
      );
    } catch (err) {
      // Never let one shop kill the loop (e.g. revoked token).
      console.error(`[cron] ${install.shop} failed:`, err);
    }
  }
}

// Register once per process. Imported for side effect from entry.server.tsx.
export function startCron(): void {
  if (global.__bgosCronStarted) return;
  global.__bgosCronStarted = true;
  cron.schedule(SCHEDULE, runDailySync, { timezone: "UTC" });
  console.log(`[cron] daily sync scheduled (${SCHEDULE} UTC)`);
}

startCron();
